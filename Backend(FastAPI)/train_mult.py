# train.py
import json
import copy
import os
import tempfile
import numpy as np
import rasterio
from fastapi import APIRouter
from shapely import MultiPolygon, Polygon
import shutil
from typing import List # 确保导入
from models.fast_scnn import FastSCNN
from models.deeplab import DeepLabV3Plus
from models.light_unet import LightUNet
from models.unet import UNet
from dataset import MultRemoteSensingSegmentationDataset
import torch
from torch.utils.data import DataLoader

from shapely import Point, buffer, coverage_union_all, envelope
from rasterio.windows import from_bounds
from rasterio.warp import transform_bounds
from ultralytics import YOLO
# ... (移除 xgboostt 的导入)
# from models.xgboostt import XGBoost 

# ... (移除 prepare_data_for_sklearn 的导入, 如果它只被XGBoost使用)
# from utils import crop_image_by_scope, identify_holes_and_split, post_process_mask, prepare_data_for_sklearn 
from utils_db import connect_db, fetch_labels_from_db, fetch_map_server_from_db, match_typeid_to_name, save_model_to_db
from utils import crop_image_by_scope, identify_holes_and_split, post_process_mask # 移除 prepare_data_for_sklearn
# from utils_yolo import create_yolo_data_yaml, create_yolo_dataset, filter_original_labels, process_yolo_results
from utils_yolo import create_Multi_yolo_data_yaml, create_multi_image_yolo_dataset, filter_original_labels, process_yolo_results # 使用新函数

# from trainers import train_torch_model, predict_torch_model, train_sklearn_model, predict_sklearn_model
from trainers import train_torch_model, predict_torch_model # 移除 sklearn 相关

def train_Multi_function(argv=None):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    conn = connect_db()
    if conn is None:
        print("无法连接到数据库，程序退出。")
        return

    # 解析列表参数
    try:
        # argv[1] 是 taskid 列表, argv[2] 是 mapfile_path 列表
        TASK_IDS_STR = argv[1]
        if not isinstance(TASK_IDS_STR, list):
             raise ValueError("taskid 必须是一个列表.")
        TASK_IDS = [int(tid) for tid in TASK_IDS_STR]

        MAPFILE_PATHS = argv[2]
        if not isinstance(MAPFILE_PATHS, list):
            raise ValueError("mapfile_path 必须是一个列表.")
        if len(TASK_IDS) != len(MAPFILE_PATHS):
            raise ValueError("taskid 和 mapfile_path 列表长度必须一致。")
    except Exception as e:
        print(f"解析任务ID或地图路径列表失败: {e}")
        if conn: conn.close()
        return

    MODEL_TYPE = argv[3]
    # BATCH_SIZE = 32 # 从参数或配置文件读取更好
    # LEARNING_RATE = 0.001 # 从参数或配置文件读取更好
    NUM_EPOCHS = int(argv[4]) # argv[4] 是 epochs
    
    # 假设USER_ID对于这个多影像训练任务是统一的，或者取第一个
    try:
        USER_ID = int(argv[9]) 
    except (ValueError, IndexError):
        print("USER_ID 无效，请提供一个整数。")
        if conn: conn.close()
        return

    # model_scope_str = argv[10] # 不再使用
    model_name = argv[11]

    model_save_dir = "/home/change/labelcode/labelMark/trained_models"
    task_model_save_dir = os.path.join(model_save_dir, str(USER_ID))
    os.makedirs(task_model_save_dir, exist_ok=True)
    detection_output_dir = os.path.join(task_model_save_dir, "detection_results")
    segmentation_output_dir = os.path.join(task_model_save_dir, "segmentation_results")
    os.makedirs(detection_output_dir, exist_ok=True)
    os.makedirs(segmentation_output_dir, exist_ok=True)

    # YOLO参数 - 修正参数顺序，与单张影像训练代码保持一致
    CONF_THRESHOLD = float(argv[5]) if len(argv) > 5 and argv[5] else 0.25 # param1 - 置信度阈值
    IMG_SIZE = int(argv[6]) if len(argv) > 6 and argv[6] else 640      # param2 - 输入图像尺寸

    # --- 数据收集 ---
    all_image_paths = []
    all_labels_data_per_image = []
    all_type_ids_from_db = set() # 使用集合收集所有唯一的type_id

    for i, task_id_int in enumerate(TASK_IDS):
        current_mapfile_path = MAPFILE_PATHS[i]
        
        # map_servers = fetch_map_server_from_db(conn, task_id_int)
        # if not map_servers:
        #     print(f"task_id {task_id_int} 未找到地图服务器路径，跳过此任务。")
        #     continue
        # map_name_from_db = map_servers[0][0]
        # current_image_path = os.path.join(current_mapfile_path, f"{map_name_from_db}.tif")
        
        current_image_path = current_mapfile_path + ".tif"
        if not os.path.exists(current_image_path):
            print(f"影像文件 {current_image_path} 不存在，跳过此任务。")
            continue

        labels_data = fetch_labels_from_db(conn, task_id_int)
        if not labels_data:
            print(f"task_id {task_id_int} 没有找到标签数据，跳过此任务。")
            continue
        
        all_image_paths.append(current_image_path)
        all_labels_data_per_image.append(labels_data)
        for _, _, type_id, *_ in labels_data:
            all_type_ids_from_db.add(type_id)

    if not all_image_paths:
        print("没有有效的影像和标签数据进行训练。")
        if conn: conn.close()
        return
    
    # 排序确保一致性
    sorted_type_ids = sorted(list(all_type_ids_from_db))

    # 提取第一个任务的用户ID和状态作为代表 (如果需要全局的)
    # user_id_representative = all_labels_data_per_image[0][0][3]
    # status_representative = all_labels_data_per_image[0][0][5]
    # 使用传入的 USER_ID
    user_id_representative = USER_ID 
    # status_representative 应该定义一个默认值或者从其他地方获取，这里用0
    status_representative = 0


    if MODEL_TYPE in ["light_unet", "unet", "fast_scnn", "deeplab"]:
        num_classes = len(sorted_type_ids) + 1 # 包括背景类
        type_id_to_class_index = {type_id: idx for idx, type_id in enumerate(sorted_type_ids)}
        background_class_index = num_classes - 1 # 背景类的索引是最后一个
        class_index_to_type_id = {idx: type_id for type_id, idx in type_id_to_class_index.items()}

        train_dataset = MultRemoteSensingSegmentationDataset(
            image_paths=all_image_paths,
            all_labels_data=all_labels_data_per_image,
            num_classes=num_classes,
            type_id_to_class_index=type_id_to_class_index,
            background_class_index=background_class_index,
            apply_transforms=True,
            target_size=(IMG_SIZE, IMG_SIZE) # 可以使用YOLO的IMG_SIZE或独立设置
        )
        
        if len(train_dataset) == 0:
            print("创建的数据集为空，无法训练。")
            if conn: conn.close()
            return

        # 从参数或配置文件读取BATCH_SIZE和LEARNING_RATE
        BATCH_SIZE = 4 # 多张影像训练使用较小的batch size
        # LEARNING_RATE = float(argv[8]) if argv[8] else 0.001 # param4 作为 LEARNING_RATE
        LEARNING_RATE = 0.001 # 默认值，或从参数读取

        dataloader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=0, pin_memory=True)

        # 加载模型 (输入通道数从第一张影像获取)
        with rasterio.open(all_image_paths[0]) as src:
            in_channels = src.count
        
        if MODEL_TYPE == "light_unet":
            model = LightUNet(in_channels=in_channels, num_classes=num_classes).to(device)
        elif MODEL_TYPE == "unet":
            model = UNet(in_channels=in_channels, num_classes=num_classes).to(device)
        elif MODEL_TYPE == "fast_scnn":
            model = FastSCNN(in_channels=in_channels, num_classes=num_classes).to(device)
        elif MODEL_TYPE == "deeplab":
            model = DeepLabV3Plus(in_channels=in_channels, num_classes=num_classes,backbone_name='mobilenet_v3_large').to(device)
        else: # Should not happen if MODEL_TYPE is validated
            print(f"未知分割模型类型: {MODEL_TYPE}")
            if conn: conn.close()
            return

        criterion = torch.nn.CrossEntropyLoss()
        optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)
        model_save_path = os.path.join(segmentation_output_dir, f"{model_name}.pth")
        
        # 注意 train_torch_model 的 patience 和 min_delta 可以作为参数传入
        train_torch_model(model, dataloader, criterion, optimizer, NUM_EPOCHS, device, model_save_path, patience=10, min_delta=0.001)

        # --- 分割模型的推理和结果保存逻辑 (这部分通常在 inference.py 中，训练后可选) ---
        # 如果训练后需要立即对这些训练影像进行一次预测并保存结果：
        # delete_existing_results_db(conn, TASK_IDS[0]) # 假设结果关联到第一个task_id
        # all_segmentation_polygons_for_db = {}
        # for i in range(len(train_dataset)):
        #     image_tensor, _, window_transform = train_dataset[i] # 获取原始数据和变换
        #     # 注意：predict_torch_model 需要的是原始尺寸的 tensor，而不是 dataloader 出来的 batch
        #     # 这里需要重新加载或使用 train_dataset.images[i] 进行处理
        #     
        #     # 示例：使用 dataset 内部存储的原始 image (numpy)
        #     raw_image_np = train_dataset.images[i] 
        #     current_image_tensor = torch.from_numpy(raw_image_np).float() # C,H,W
        #
        #     predicted_mask = predict_torch_model(model, current_image_tensor, device)
        #     predicted_mask = post_process_mask(
        #         predicted_mask, min_object_size=int(argv[6]), # param2 for post_process
        #         hole_size_threshold=int(argv[7]),            # param3 for post_process
        #         boundary_smoothing=int(argv[8] if argv[8] else 3) # param4 for post_process
        #     )
        #     segmentation_polygons = identify_holes_and_split(
        #         predicted_mask, 
        #         train_dataset.source_transforms[i], # 使用对应影像的原始变换
        #         class_index_to_type_id, 
        #         background_class_index
        #     )
        #     # 合并多张影像的预测结果 (如果需要按type_id合并)
        #     for type_id_key, polys in segmentation_polygons.items():
        #         if type_id_key not in all_segmentation_polygons_for_db:
        #             all_segmentation_polygons_for_db[type_id_key] = []
        #         all_segmentation_polygons_for_db[type_id_key].extend(polys)
        #
        # # 仅当有结果时插入，并关联到第一个TASK_ID和传入的USER_ID
        # if all_segmentation_polygons_for_db:
        #     insert_segmentation_results_db(conn, TASK_IDS[0], all_segmentation_polygons_for_db, user_id_representative, status_representative)
        # --- 推理和结果保存逻辑结束 ---

        torch.cuda.empty_cache()

        type_id_to_name = match_typeid_to_name(conn, table_name="type")
        mapping_data = "背景: 通道 {}; ".format(background_class_index)
        if type_id_to_name:
            mapping_parts = [
                f"{type_id_to_name.get(type_id, f'未知类别-{type_id}')}: 通道 {idx}"
                for idx, type_id in class_index_to_type_id.items()
            ]
            mapping_data += "; ".join(mapping_parts)
        else:
            mapping_data += "; ".join([f"类别{type_id}: 通道 {idx}" for type_id, idx in type_id_to_class_index.items()])
        
        with rasterio.open(all_image_paths[0]) as src: # 从第一张图获取通道数
            input_num = src.count

        tasktype = argv[12]
        save_model_to_db(
            conn=conn, model_name=model_name, user_id=user_id_representative, mapping=mapping_data,
            model_path=model_save_path, input_num=input_num, output_num=num_classes,
            model_type=MODEL_TYPE, tasktype=tasktype
        )

    elif MODEL_TYPE == "yolo":
        # 为YOLO创建全局的 type_id -> class_id 映射
        type_id_to_class_id_global = {type_id: i for i, type_id in enumerate(sorted_type_ids)}
        class_id_to_type_id_global = {i: type_id for type_id, i in type_id_to_class_id_global.items()}
        
        # 获取 type_id 到 type_name 的映射 - 移到这里，在使用之前定义
        type_id_to_name = match_typeid_to_name(conn, table_name="type")
        if not type_id_to_name:
            print("无法获取 type_id 到 type_name 的映射，使用默认类别名。")
            type_id_to_name = {}
        
        class_names_for_yaml = [str(type_id_to_name.get(tid, f"class_{tid}")) for tid in sorted_type_ids] # 获取类别名

        with tempfile.TemporaryDirectory() as temp_yolo_data_dir:
            images_base_dir, labels_base_dir, _, _ = create_multi_image_yolo_dataset(
                all_image_paths,
                all_labels_data_per_image,
                temp_yolo_data_dir,
                type_id_to_class_id_global
            )
            
            data_yaml_path = create_Multi_yolo_data_yaml(temp_yolo_data_dir, images_base_dir, labels_base_dir, class_names_for_yaml)

            model = YOLO("yolo11m-obb.pt") # 或者 "yolov8n-obb.pt" 等
            # NUM_EPOCHS_YOLO = int(argv[5]) if argv[5] else 50 # param1 for epochs
            # BATCH_SIZE_YOLO = int(argv[4]) if argv[4] else 8   # assistInput for batch size

            model.train(
                data=data_yaml_path,
                epochs=NUM_EPOCHS,
                imgsz=IMG_SIZE,
                device=device,
                project=detection_output_dir, # 保存到用户模型的检测结果目录下
                name=f"{model_name}", # 训练运行的名称
                save=True, # 保存最终模型
                patience=10, # 早停参数
                workers=0, # 多windows下workers>0可能出问题
                # 以下参数可以按需调整
                # conf=CONF_THRESHOLD, # train时一般不用conf
                # iou=0.7, # train时的iou阈值
            )
            
            # --- YOLO 推理和结果保存逻辑 (可选，类似分割模型) ---
            # all_detection_polygons_for_db = {}
            # for i, image_path_for_inf in enumerate(all_image_paths):
            #     # 需要将TIF转为JPG进行推理，或直接用原始TIF路径（如果YOLO支持）
            #     # YOLO通常在 .train() 后会加载最佳模型，可以直接用 model 对象进行推理
            #     # 这里假设 model 对象已是训练好的最佳模型
            #     temp_infer_jpg = os.path.join(temp_yolo_data_dir, f"infer_img_{i}.jpg")
            #     if not convert_tif_to_jpeg(image_path_for_inf, temp_infer_jpg):
            #         continue
            #
            #     results = model(temp_infer_jpg, conf=CONF_THRESHOLD, imgsz=IMG_SIZE) 
            #
            #     with rasterio.open(image_path_for_inf) as src: # 获取对应影像的变换
            #         current_transform = src.transform
            #
            #     detection_polygons, _, _ = process_yolo_results(
            #         results, current_transform, TASK_IDS[0], user_id_representative, status_representative, 
            #         conn, class_id_to_type_id_global, None, image_path_for_inf # output_image_path=None
            #     )
            #     # 合并结果
            #     for type_id_key, polys in detection_polygons.items():
            #         if type_id_key not in all_detection_polygons_for_db:
            #             all_detection_polygons_for_db[type_id_key] = []
            #         all_detection_polygons_for_db[type_id_key].extend(polys)
            #
            # if all_detection_polygons_for_db:
            #    delete_existing_results_db(conn, TASK_IDS[0]) # 删除第一个task的旧结果
            #    insert_segmentation_results_db(conn, TASK_IDS[0], all_detection_polygons_for_db, user_id_representative, status_representative)
            # --- YOLO 推理逻辑结束 ---

        model = None # 释放显存
        torch.cuda.empty_cache()

        # type_id_to_name 已经在上面定义了，这里不需要重新获取
        mapping_parts = [
            f"{type_id_to_name.get(type_id, f'未知类别-{type_id}')}: 类别索引 {class_id}"
            for type_id, class_id in type_id_to_class_id_global.items()
        ]
        mapping_data = "; ".join(mapping_parts)
        
        with rasterio.open(all_image_paths[0]) as src: # 从第一张图获取通道数
            input_num = src.count
        
        tasktype = argv[12] if len(argv) > 12 else "segmentation"
        # YOLO 模型保存路径通常在 project/name/weights/best.pt
        yolo_model_save_path = os.path.join(detection_output_dir, f"{model_name}", "weights", "best.pt")
        if not os.path.exists(yolo_model_save_path):
             yolo_model_save_path = os.path.join(detection_output_dir, f"{model_name}", "weights", "last.pt") # 备选

        save_model_to_db(
            conn=conn, model_name=model_name, user_id=user_id_representative, mapping=mapping_data,
            model_path=yolo_model_save_path, input_num=input_num, output_num=len(type_id_to_class_id_global),
            model_type=MODEL_TYPE, tasktype=tasktype
        )

    else:
        print(f"未知的模型类型或不支持多影像训练的模型类型: {MODEL_TYPE}")
        if conn: conn.close()
        return

    if conn: conn.close()
    print("多影像训练任务完成!")