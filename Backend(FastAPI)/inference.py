import json
import sys
import os
import rasterio
from shapely import MultiPolygon, Polygon
from utils import crop_image_by_scope, identify_holes_and_split, post_process_mask, prepare_data_for_sklearn
from utils_db import connect_db, delete_existing_results_db, fetch_labels_from_db, fetch_map_server_from_db, fetch_model_from_db, insert_segmentation_results_db
from utils_yolo import process_yolo_results, filter_original_labels_with_type
# from utils_yolo import filter_original_labels_with_type
import torch
from torch.utils.data import DataLoader
from models.light_unet import LightUNet
from models.unet import UNet
from models.fast_scnn import FastSCNN
from models.xgboostt import XGBoost
from dataset import RemoteSensingSegmentationDataset
from models.deeplab import DeepLabV3Plus
# from utils import (
#     connect_db, crop_image_by_scope, fetch_labels_from_db, delete_existing_results_db,
#     insert_segmentation_results_db,
#     post_process_mask, identify_holes_and_split,
#     process_yolo_results, draw_boxes_on_image,
#     fetch_map_server_from_db, fetch_typeid_from_db, create_original_label_mask,fetch_model_from_db
# )
import joblib
import numpy as np
from PIL import Image

def predict_torch_model(model, image_tensor, device):
    """使用 PyTorch 模型进行预测"""
    model.eval()
    with torch.no_grad():
        image_tensor = image_tensor.unsqueeze(0).to(device)
        outputs = model(image_tensor)
        if outputs.shape[2:] != image_tensor.shape[2:]:
            outputs = torch.nn.functional.interpolate(outputs, size=image_tensor.shape[2:], mode='bilinear',
                                                      align_corners=False)
        probabilities = torch.softmax(outputs, dim=1)
        predicted_mask = torch.argmax(probabilities, dim=1).squeeze().cpu().numpy()
    return predicted_mask.astype(np.uint8)

def predict_sklearn_model(model, X, image_shape):
    """使用 scikit-learn 模型进行预测"""
    predictions = model.predict(X)
    return predictions.reshape(image_shape[1], image_shape[2]).astype(np.uint8)

def predict_large_image_with_overlap(model, image, block_size, overlap, predict_func, device=None):
    C, H, W = image.shape
    block_h, block_w = block_size
    overlap_h, overlap_w = overlap
    step_h = block_h - overlap_h
    step_w = block_w - overlap_w

    pad_h = (step_h - H % step_h) % step_h
    pad_w = (step_w - W % step_w) % step_w
    padded_image = np.pad(image, ((0, 0), (0, pad_h), (0, pad_w)), mode='constant')
    padded_H, padded_W = padded_image.shape[1], padded_image.shape[2]

    predicted_mask = np.zeros((padded_H, padded_W), dtype=np.float32)
    count_mask = np.zeros((padded_H, padded_W), dtype=np.float32)

    for i in range(0, padded_H - overlap_h, step_h):
        for j in range(0, padded_W - overlap_w, step_w):
            block = padded_image[:, i:i + block_h, j:j + block_w]
            if predict_func.__name__ == "predict_torch_model":
                block_tensor = torch.from_numpy(block).float().to(device)
                block_pred = predict_func(model, block_tensor, device)
            else:  # predict_sklearn_model
                X_block = block.transpose(1, 2, 0).reshape(-1, block.shape[0])
                block_pred = predict_func(model, X_block, (None, block_h, block_w))
            predicted_mask[i:i + block_h, j:j + block_w] += block_pred
            count_mask[i:i + block_h, j:j + block_w] += 1

    predicted_mask /= count_mask
    predicted_mask = np.round(predicted_mask).astype(np.uint8)
    return predicted_mask[:H, :W]

def predict_large_image_with_xgboost_overlap(model, image, block_size, overlap):
    """
    XGBoost 专用的分块推理函数，支持 GPU 推理和坐标修正
    
    参数:
        model: XGBoost 模型实例
        image: 输入图像 (C, H, W)
        block_size: 分块大小 (height, width)
        overlap: 重叠大小 (height, width)
    
    返回:
        predicted_mask: 预测掩码 (H, W)
    """
    C, H, W = image.shape
    block_h, block_w = block_size
    overlap_h, overlap_w = overlap
    step_h = block_h - overlap_h
    step_w = block_w - overlap_w

    # 初始化预测结果和计数掩码（使用原始图像尺寸）
    predicted_mask = np.zeros((H, W), dtype=np.float32)
    count_mask = np.zeros((H, W), dtype=np.float32)

    print(f"开始分块推理，图像大小: {H}x{W}, 分块大小: {block_h}x{block_w}, 重叠: {overlap_h}x{overlap_w}")
    
    # 计算分块的起始位置
    i_positions = list(range(0, H, step_h))
    j_positions = list(range(0, W, step_w))
    
    # 确保最后一个位置能覆盖到图像边界
    if i_positions[-1] + block_h < H:
        i_positions.append(H - block_h)
    if j_positions[-1] + block_w < W:
        j_positions.append(W - block_w)
    
    total_blocks = len(i_positions) * len(j_positions)
    current_block = 0
    
    # 分块处理
    for i in i_positions:
        for j in j_positions:
            current_block += 1
            if current_block % 10 == 0 or current_block == 1:  # 减少输出频率
                print(f"处理块 {current_block}/{total_blocks}: ({i}:{min(i+block_h, H)}, {j}:{min(j+block_w, W)})")
            
            # 计算实际的块边界
            i_end = min(i + block_h, H)
            j_end = min(j + block_w, W)
            actual_block_h = i_end - i
            actual_block_w = j_end - j
            
            # 提取当前块
            block = image[:, i:i_end, j:j_end]
            
            # 准备数据用于 XGBoost
            try:
                X_block, _ = prepare_data_for_sklearn(block, np.zeros((actual_block_h, actual_block_w)))
                
                # 使用 XGBoost 进行预测（GPU 加速）
                block_pred = model.predict(X_block)
                block_pred = block_pred.reshape(actual_block_h, actual_block_w).astype(np.float32)
                
                # 累加预测结果（使用实际块尺寸）
                predicted_mask[i:i_end, j:j_end] += block_pred
                count_mask[i:i_end, j:j_end] += 1
                
            except Exception as e:
                print(f"块 {current_block} 预测失败: {e}")
                print(f"块位置: ({i}:{i_end}, {j}:{j_end}), 块尺寸: {actual_block_h}x{actual_block_w}")
                print(f"X_block形状: {X_block.shape if 'X_block' in locals() else 'N/A'}")
                # 如果预测失败，使用背景类填充
                block_pred = np.zeros((actual_block_h, actual_block_w), dtype=np.float32)
                predicted_mask[i:i_end, j:j_end] += block_pred
                count_mask[i:i_end, j:j_end] += 1

    # 平均化重叠区域的预测结果
    predicted_mask = np.divide(predicted_mask, count_mask, 
                              out=np.zeros_like(predicted_mask), 
                              where=count_mask!=0)
    
    # 转换为整数类型
    predicted_mask = np.round(predicted_mask).astype(np.uint8)
    
    print(f"分块推理完成，输出掩码形状: {predicted_mask.shape}")
    
    return predicted_mask

def inference(argv=None):
    TASK_ID = int(argv[1])
    MAPFILE_PATH = argv[2]
    USER_ID = int(argv[3])
    MODEL_name = str(argv[4]).split(".")[0]
    # model_scope_str = argv[9]  # 模型作用范围

    # 类别映射
    class_mapping = argv[10]

    # 解析 model_scope
    # try:
    #     model_scope = json.loads(model_scope_str)
    #     if not model_scope:
    #         print("No model scope provided, will process entire image.")
    #     else:
    #         print("Model scope coordinates:", model_scope)
    # except json.JSONDecodeError as e:
    #     print(f"Error decoding model scope: {e}")
    #     model_scope_str = None

    # 连接数据库
    conn = connect_db()
    if conn is None:
        print("无法连接到数据库，程序退出。")
        return

    model_inf = fetch_model_from_db(conn,MODEL_name)

    # 获取地图服务器路径
    # map_servers = fetch_map_server_from_db(conn, TASK_ID)
    # if not map_servers:
    #     print(f"task_id {TASK_ID} 未找到地图服务器路径，请检查数据库。")
    #     conn.close()
    #     return
    # map_name = map_servers[0][0]
    # IMAGE_PATH = os.path.join(MAPFILE_PATH, f"{map_name}.tif")
    IMAGE_PATH = MAPFILE_PATH + ".tif"
    # 获取标签数据
    labels_data = fetch_labels_from_db(conn, TASK_ID)
    if not labels_data:
        print(f"task_id {TASK_ID} 没有找到标签数据，将不使用原始标签掩膜。")
        labels_data = None

    # 提取 user_id 和 status
    user_id = USER_ID
    status = 0
    # type_arr = fetch_typeid_from_db(conn, TASK_ID)

    # 定义模型保存路径
    model_save_path = model_inf['path']

    # 设置设备
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    model_status = model_inf["status"]

    if model_status == 0:

        MODEL_TYPE = model_inf['model_type']

        # 解析 class_mapping
        try:
            # 如果 class_mapping 已经是字典，直接使用；否则尝试解析为字典
            class_mapping_dict = class_mapping if isinstance(class_mapping, dict) else json.loads(class_mapping)
        except json.JSONDecodeError as e:
            print(f"Error decoding class_mapping: {e}")
            conn.close()
            return

        # 根据模型类型设置类别映射
        if MODEL_TYPE in ["light_unet", "unet", "fast_scnn", "xgboost", "deeplab"]:
            num_classes = len(class_mapping_dict) + 1  # 假设有一个背景类
            class_index_to_type_id = {}
            background_class_index = None
            for idx in range(num_classes):
                if idx in class_mapping_dict and class_mapping_dict[idx]:
                    class_index_to_type_id[idx] = class_mapping_dict[idx]
                else:
                    background_class_index = idx
            if background_class_index is None:
                print("No background class found in class_mapping.")
                conn.close()
                return
        elif MODEL_TYPE == "yolo":
            # 修改YOLO的类别映射处理，使其与light_unet等模型一致
            num_classes = len(class_mapping_dict) + 1  # 假设有一个背景类
            class_index_to_type_id = {}
            background_class_index = None
            for idx in range(num_classes):
                if idx in class_mapping_dict and class_mapping_dict[idx]:
                    class_index_to_type_id[idx] = class_mapping_dict[idx]
                else:
                    background_class_index = idx
            if background_class_index is None:
                print("No background class found in class_mapping.")
                conn.close()
                return
            # 兼容旧代码，保留class_id_to_type_id
            class_id_to_type_id = class_index_to_type_id

        # 根据模型类型加载模型
        if MODEL_TYPE in ["light_unet", "unet", "fast_scnn", "deeplab"]:
            with rasterio.open(IMAGE_PATH) as src:
                in_channels = src.count
            # num_classes = len(type_arr[0][0].split(",")) + 1
            num_classes = model_inf["output_num"]
            if MODEL_TYPE == "light_unet":
                model = LightUNet(in_channels=in_channels, num_classes=num_classes).to(device)
            elif MODEL_TYPE == "unet":
                model = UNet(in_channels=in_channels, num_classes=num_classes).to(device)
            elif MODEL_TYPE == "fast_scnn":
                model = FastSCNN(in_channels=in_channels, num_classes=num_classes).to(device)
            elif MODEL_TYPE == "deeplab":
                model = DeepLabV3Plus(in_channels=in_channels, num_classes=num_classes).to(device)
            model.load_state_dict(torch.load(model_save_path, map_location=device))
        elif MODEL_TYPE == "xgboost":
            model = joblib.load(model_save_path)
        elif MODEL_TYPE == "yolo":
            from ultralytics import YOLO
            # 检查模型文件是否存在
            if not os.path.exists(model_save_path):
                print(f"错误：YOLO模型文件不存在: {model_save_path}")
                # 尝试查找可能的替代路径
                model_dir = os.path.dirname(os.path.dirname(model_save_path))
                possible_models = []
                for root, dirs, files in os.walk(model_dir):
                    for file in files:
                        if file.endswith('.pt'):
                            possible_models.append(os.path.join(root, file))
                
                if possible_models:
                    print(f"找到可能的模型文件: {possible_models[0]}")
                    model_save_path = possible_models[0]
                else:
                    print("未找到任何可用的YOLO模型文件")
                    conn.close()
                    return
            
            try:
                model = YOLO(model_save_path)
                print(f"成功加载YOLO模型: {model_save_path}")
            except Exception as e:
                print(f"加载YOLO模型失败: {e}")
                conn.close()
                return
        else:
            print(f"未知的模型类型: {MODEL_TYPE}")
            conn.close()
            return

        # 进行推理
        if MODEL_TYPE in ["light_unet", "unet", "fast_scnn", "xgboost", "deeplab"]:
            # 直接加载整个图像
            with rasterio.open(IMAGE_PATH) as src:
                image = src.read().astype(np.float32) / 255.0  # (C, H, W)
                window_transform = src.transform  # 用于后续多边形转换

            block_size = (1024, 1024)
            overlap = (128, 128)
            _, H, W = image.shape

            if MODEL_TYPE in ["light_unet", "unet", "fast_scnn", "deeplab"]:
                if H <= block_size[0] and W <= block_size[1]:
                    image_tensor = torch.from_numpy(image).float().to(device)
                    predicted_mask = predict_torch_model(model, image_tensor, device)
                else:
                    predicted_mask = predict_large_image_with_overlap(
                        model, image, block_size, overlap, predict_torch_model, device)

            # 后处理掩膜
            predicted_mask = post_process_mask(
                predicted_mask, min_object_size=int(argv[5]), hole_size_threshold=int(argv[6]),
                boundary_smoothing=int(argv[7])
            )

            # 转换为多边形
            segmentation_polygons = identify_holes_and_split(
                predicted_mask, window_transform,
                class_index_to_type_id,
                background_class_index
            )

            # 更新数据库结果
            insert_segmentation_results_db(conn, TASK_ID, segmentation_polygons, user_id, status)
            torch.cuda.empty_cache()

        elif MODEL_TYPE == "yolo":
            temp_dir = "temp_inference"
            os.makedirs(temp_dir, exist_ok=True)
            jpeg_filename = f"inference_{TASK_ID}.jpg"
            jpeg_path = os.path.join(temp_dir, jpeg_filename)

            # cropped_image_path, crop_transform = crop_image_by_scope(IMAGE_PATH, model_scope_str)

            with rasterio.open(IMAGE_PATH) as src:
                image = src.read()
                image = image.transpose(1, 2, 0)
                if image.shape[2] > 3:
                    image = image[:, :, :3]
                image = (image / image.max() * 255).astype(np.uint8)
                Image.fromarray(image).save(jpeg_path, "JPEG")
                image_transform = src.transform

            results = model(jpeg_path, conf=float(argv[5]), imgsz=int(argv[6]))

            detection_polygons, _, _ = process_yolo_results(
                results, image_transform, TASK_ID, user_id, status, conn,
                class_index_to_type_id, None, IMAGE_PATH
            )

            original_polygons_with_type = []
            if labels_data:
                for _, geom_str, type_id, *_ in labels_data:
                    coords_str_list = geom_str.split(',')
                    coords_list = [(float(coords_str_list[i].strip()), float(coords_str_list[i + 1].strip()))
                                for i in range(0, len(coords_str_list), 2)]
                    poly = Polygon(coords_list)
                    original_polygons_with_type.append((poly, type_id))


            filtered_original_with_type = filter_original_labels_with_type(original_polygons_with_type, detection_polygons,
                                                                distance_threshold=float(argv[7]))
            
            print("q")

            filtered_original_dict = {}
            for poly, type_id in filtered_original_with_type:
                if type_id not in filtered_original_dict:
                    filtered_original_dict[type_id] = []
                filtered_original_dict[type_id].append(poly)

            type_ids = set(detection_polygons.keys()) | set(filtered_original_dict.keys())
            segmentation_polygons = {type_id: filtered_original_dict.get(type_id, []) + detection_polygons.get(type_id, [])
                                    for type_id in type_ids}

            delete_existing_results_db(conn, TASK_ID)
            insert_segmentation_results_db(conn, TASK_ID, segmentation_polygons, user_id, status)

            # if model_scope:
            #     os.remove(jpeg_path)
    
            torch.cuda.empty_cache()
    else:
        # 加载TorchScript模型
        try:
            print("使用torchscript模型进行推理")
            print(f"加载模型: {model_save_path}")
            model = torch.jit.load(model_save_path).to(device)
            model.eval()
            
            # 使用相同的class_mapping解析逻辑
            try:
                class_mapping_dict = class_mapping if isinstance(class_mapping, dict) else json.loads(class_mapping)
                num_classes = len(class_mapping_dict) + 1
                class_index_to_type_id = {}
                background_class_index = None
                for idx in range(num_classes):
                    if idx in class_mapping_dict and class_mapping_dict[idx]:
                        class_index_to_type_id[idx] = class_mapping_dict[idx]
                    else:
                        background_class_index = idx
                if background_class_index is None:
                    print("No background class found in class_mapping.")
                    conn.close()
                    return
            except Exception as e:
                print(f"类别映射解析失败: {e}")
                conn.close()
                return
        
            # 图像加载和预处理
            with rasterio.open(IMAGE_PATH) as src:
                image = src.read().astype(np.float32) / 255.0
                window_transform = src.transform
            
            # 分块推理
            block_size = (1024, 1024)
            overlap = (128, 128)
            _, H, W = image.shape
            
            if H <= block_size[0] and W <= block_size[1]:
                image_tensor = torch.from_numpy(image).float().to(device)
                with torch.no_grad():
                    outputs = model(image_tensor.unsqueeze(0))
                predicted_mask = torch.argmax(torch.softmax(outputs, dim=1), dim=1).squeeze().cpu().numpy()
            else:
                def torchscript_predict(model, block_tensor, device):
                    with torch.no_grad():
                        outputs = model(block_tensor.unsqueeze(0))
                    return torch.argmax(torch.softmax(outputs, dim=1), dim=1).squeeze().cpu().numpy()
                
                predicted_mask = predict_large_image_with_overlap(
                    model, image, block_size, overlap, torchscript_predict, device
                )
            
            # 后续处理与现有流程一致
            predicted_mask = post_process_mask(
                predicted_mask, min_object_size=int(argv[5]), hole_size_threshold=int(argv[6]),
                boundary_smoothing=int(argv[7])
            )
            segmentation_polygons = identify_holes_and_split(
                predicted_mask, window_transform,
                class_index_to_type_id,
                background_class_index
            )
            insert_segmentation_results_db(conn, TASK_ID, segmentation_polygons, user_id, status)
            torch.cuda.empty_cache()
        except Exception as e:
            print(f"TorchScript模型加载或推理失败: {e}")
            conn.close()
            return

    conn.close()
    print("推理任务完成!")
