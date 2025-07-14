import copy
import json
import os
import tempfile
import numpy as np
import rasterio
from shapely import Point, buffer, coverage_union_all, envelope
from utils_db import connect_db, delete_point_results_db, fetch_labels_from_db, fetch_map_server_from_db
from utils_sam import generate_point_coordinates_sam, identify_holes_and_split_SAM, post_process_mask_sam
import torch
import torch.multiprocessing as mp
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import requests  # 添加requests库用于回调
# from utils import connect_db, delete_point_results_db, fetch_labels_from_db, fetch_map_server_from_db, generate_point_coordinates_sam, identify_holes_and_split_SAM, post_process_mask_sam
from train import train_function
from train_mult import train_Multi_function
from update_label import insert_segmentation_results_db, update_label_function
from inference import inference
from rasterio.windows import from_bounds
from rasterio.warp import transform_bounds

from pydantic import BaseModel, Field #确保导入 Field
from typing import List # 确保导入 List

# 设置多进程启动方式
mp.set_start_method('spawn', force=True)

app = FastAPI(debug=True)  # 创建 FastAPI 实例
global_sam = None  # 全局 SamGeo 实例

# Spring Boot回调URL配置
SPRING_BOOT_BASE_URL = "http://localhost:1290"

def send_callback(endpoint, data):
    """发送回调到Spring Boot"""
    try:
        url = f"{SPRING_BOOT_BASE_URL}/task-callback/{endpoint}"
        response = requests.post(url, json=data, timeout=10)
        print(f"回调发送成功: {endpoint}, 响应: {response.status_code}")
    except Exception as e:
        print(f"回调发送失败: {endpoint}, 错误: {str(e)}")

def train_with_callback(argv):
    """带回调的训练函数"""
    try:
        train_function(argv)
        # 训练成功，发送成功回调
        task_id = argv[1]
        user_id = argv[9] if len(argv) > 9 else None
        model_name = argv[11] if len(argv) > 11 else ""
        
        if user_id:
            send_callback("train-complete", {
                "taskId": task_id,
                "userId": user_id,
                "modelName": model_name,
                "success": True,
                "message": "训练任务完成"
            })
    except Exception as e:
        # 训练失败，发送失败回调
        task_id = argv[1]
        user_id = argv[9] if len(argv) > 9 else None
        model_name = argv[11] if len(argv) > 11 else ""
        
        if user_id:
            send_callback("train-complete", {
                "taskId": task_id,
                "userId": user_id,
                "modelName": model_name,
                "success": False,
                "message": f"训练任务失败: {str(e)}"
            })
        print(f"训练任务失败: {str(e)}")

def train_multi_with_callback(argv):
    """带回调的批量训练函数"""
    try:
        train_Multi_function(argv)
        # 批量训练成功，发送成功回调
        task_ids = argv[1]  # 这是一个列表
        user_id = argv[9] if len(argv) > 9 else None
        model_name = argv[11] if len(argv) > 11 else ""
        
        if user_id:
            send_callback("batch-train-complete", {
                "taskIds": task_ids,
                "userId": user_id,
                "modelName": model_name,
                "success": True,
                "message": "批量训练任务完成"
            })
    except Exception as e:
        # 批量训练失败，发送失败回调
        task_ids = argv[1]
        user_id = argv[9] if len(argv) > 9 else None
        model_name = argv[11] if len(argv) > 11 else ""
        
        if user_id:
            send_callback("batch-train-complete", {
                "taskIds": task_ids,
                "userId": user_id,
                "modelName": model_name,
                "success": False,
                "message": f"批量训练任务失败: {str(e)}"
            })
        print(f"批量训练任务失败: {str(e)}")

def inference_with_callback(argv):
    """带回调的推理函数"""
    try:
        inference(argv)
        # 推理成功，发送成功回调
        task_id = argv[1]
        user_id = argv[3] if len(argv) > 3 else None
        model_name = argv[4] if len(argv) > 4 else ""
        
        if user_id:
            send_callback("inference-complete", {
                "taskId": task_id,
                "userId": user_id,
                "modelName": model_name,
                "success": True,
                "message": "推理任务完成"
            })
    except Exception as e:
        # 推理失败，发送失败回调
        task_id = argv[1]
        user_id = argv[3] if len(argv) > 3 else None
        model_name = argv[4] if len(argv) > 4 else ""
        
        if user_id:
            send_callback("inference-complete", {
                "taskId": task_id,
                "userId": user_id,
                "modelName": model_name,
                "success": False,
                "message": f"推理任务失败: {str(e)}"
            })
        print(f"推理任务失败: {str(e)}")

# 启动事件：初始化 SamGeo
@app.on_event("startup")
async def startup_event():
    from samgeo import SamGeo2
    # from samgeo import SamGeo
    global global_sam
    if global_sam is None:
        global_sam = SamGeo2(  # 延迟实例化到启动事件
            model_id="sam2-hiera-large",
            # model_id="sam2-hiera-small",
            automatic=False,
            device="cuda",
        )
        # global_sam = SamGeo(  # 延迟实例化到启动事件
        #     model_id="vit_b",
        #     automatic=False,
        #     device="cuda",
        # )
    print("SamGeo 已实例化")

# 关闭事件：清理资源
@app.on_event("shutdown")
async def shutdown_event():
    global global_sam
    global_sam = None
    torch.cuda.empty_cache()
    print("SamGeo 已清理，任务处理进程已关闭")


# 定义请求体模型
class AssistFunctionRequest(BaseModel):
    taskid: str
    mapfile_path: str
    functionName: str
    assistInput: str = ""
    modelName: str = ""
    param1: str = ""
    param2: str = ""
    param3: str = ""
    param4: str = ""
    user_id: str = None
    modelScopeStr: str = ""
    tasktype: str = ""  # 区分任务类型

class InferenceFunctionRequest(BaseModel):
    taskid: str
    mapfile_path: str
    user_id: str
    model: str = ""
    param1: str = ""
    param2: str = ""
    param3: str = ""
    param4: str = ""
    categoryMapping: str = "{}"  # 新增字段，接收 JSON 字符串
    modelScopeStr: str = ""

class UpdateLabelRequest(BaseModel):
    taskid: str
    mapfile_path: str

class AssistMultFunctionRequest(BaseModel): # 重命名并修改
    taskid: List[str] = Field(..., description="任务ID列表")
    mapfile_path: List[str] = Field(..., description="对应任务ID的地图文件根路径列表")
    functionName: str
    assistInput: str = ""
    modelName: str = ""
    param1: str = ""
    param2: str = ""
    param3: str = ""
    param4: str = ""
    user_id: str = None # 通常训练任务会关联一个用户
    # modelScopeStr: str = "" # 移除，训练时不再使用
    tasktype: str = ""  # 区分任务类型

@app.post("/assistFunction")
async def assist_function(request: AssistFunctionRequest):
    """处理 assist_function 请求，异步执行训练任务"""
    try:
        argv = ["", request.taskid, request.mapfile_path, request.functionName, request.assistInput,
                request.param1, request.param2, request.param3, request.param4, request.user_id,
                request.modelScopeStr, request.modelName, request.tasktype]
        print(f"收到 assist_function 请求: {argv}")
        
        if not torch.cuda.is_available():
            raise RuntimeError("CUDA不可用，请检查GPU和驱动")
        
        # 根据功能名称选择执行方式
        if request.functionName == "sam_inference":
            # SAM预标注功能立即执行，需要转换参数格式
            sam_argv = ["", request.taskid, request.mapfile_path, request.user_id, "SAM",
                       request.param1, request.param2, request.param3, request.param4,
                       request.modelScopeStr, {}]  # 最后一个参数是class_mapping，SAM不需要
            inference_sam(sam_argv)
            return {"code": 200, "message": "SAM预标注完成"}
        elif request.functionName == "xgboost":
            # XGBoost提取目标功能立即执行
            train_function(argv)
            return {"code": 200, "message": "提取目标完成"}
        else:
            # 深度学习模型训练异步执行
            process = mp.Process(target=train_with_callback, args=(argv,), daemon=True)
            process.start()
            return {"code": 200, "message": "训练任务已启动"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"训练任务启动失败: {str(e)}")
    
@app.post("/Multi_assistFunction")
async def assist_Multi_function(request: AssistMultFunctionRequest): # 使用新的请求模型
    """处理批量训练请求，异步执行多影像训练"""
    try:
        # modelScopeStr 参数已移除，用空字符串占位或调整 train_function 的参数解析
        argv = ["", request.taskid, request.mapfile_path, request.functionName, request.assistInput,
                request.param1, request.param2, request.param3, request.param4, request.user_id,
                "", request.modelName, request.tasktype] # modelScopeStr 用空字符串替代
        print(f"收到 assist_function (多影像训练) 请求: {argv}")

        if not torch.cuda.is_available():
            raise RuntimeError("CUDA不可用，请检查GPU和驱动")

        # 异步执行批量训练任务
        process = mp.Process(target=train_multi_with_callback, args=(argv,), daemon=True)
        process.start()
        return {"code": 200, "message": "批量训练任务已启动"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"批量训练任务启动失败: {str(e)}")

@app.post("/inferenceFunction")
async def inference_function(request: InferenceFunctionRequest):
    """处理 inference_function 请求，异步执行推理任务"""
    try:
        class_mapping = json.loads(request.categoryMapping)
        if not isinstance(class_mapping, dict):
            raise ValueError("categoryMapping must be a dictionary")
        class_mapping = {int(key): int(value) for key, value in class_mapping.items()}
        
        argv = ["", request.taskid, request.mapfile_path, request.user_id, request.model,
                request.param1, request.param2, request.param3, request.param4,
                request.modelScopeStr, class_mapping]
        print(f"收到 inference_function 请求: {argv}")
        
        if not torch.cuda.is_available():
            raise RuntimeError("CUDA不可用，请检查GPU和驱动")
        
        # 异步执行推理任务
        if request.model == "SAM":
            inference_sam(argv)
            return {"code": 200, "message": "SAM推理任务完成"}
        else:
            # 使用独立进程异步执行推理
            process = mp.Process(target=inference_with_callback, args=(argv,), daemon=True)
            process.start()
            return {"code": 200, "message": "推理任务已启动"}
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid categoryMapping JSON: {str(e)}")
    except (ValueError, TypeError) as e:
        raise HTTPException(status_code=400, detail=f"categoryMapping values must be valid integers: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"推理任务启动失败: {str(e)}")

@app.post("/update_label")
async def update_label(request: UpdateLabelRequest):
    """处理 update_label 请求，立即执行"""
    try:
        argv = ["", request.taskid, request.mapfile_path]
        print(f"收到 update_label 请求: {argv}")
        
        # 立即执行 update_label_function
        update_label_function(argv)
        return {"code": 200, "message": "更新样本完成"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新样本失败: {str(e)}")
    
def inference_sam(argv):
    # 连接数据库
    # conn = db_conn
    conn = connect_db()
    if conn is None:
        print("无法连接到数据库，程序退出。")
        return
    TASK_ID = int(argv[1])
    MAPFILE_PATH = argv[2]

    # 获取地图服务器路径
    # map_servers = fetch_map_server_from_db(conn, TASK_ID)
    # if not map_servers:
    #     print(f"task_id {TASK_ID} 未找到地图服务器路径，请检查数据库。")
    #     conn.close()
    #     return
    # # 假设 map_server 是单条记录，取第一个值
    # map_name = map_servers[0][0]  # fetchall 返回元组列表，提取第一个元组的第一个元素
    # # IMAGE_PATH = f"{MAPFILE_PATH}/{map_name}.tif"  # 修正路径拼接，使用斜杠分隔
    # IMAGE_PATH = os.path.join(f"{MAPFILE_PATH}", f"{map_name}.tif") 
    IMAGE_PATH = MAPFILE_PATH + ".tif"

    # 获取标签数据
    labels_data = fetch_labels_from_db(conn, TASK_ID)
    if not labels_data:
        print(f"task_id {TASK_ID} 没有找到标签数据，请检查数据库。")
        conn.close()
        return

    # 提取 user_id 和 status
    user_ids = set(row[3] for row in labels_data)
    if len(user_ids) > 1:
        print(f"警告: task_id {TASK_ID} 包含多个 user_id: {user_ids}，使用第一个")
    user_id = labels_data[0][3]
    status = labels_data[0][5]

    # 获取所有 type_ids
    type_ids = set(row[2] for row in labels_data)

    # 创建临时文件目录
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_out = os.path.join(temp_dir, "sam.tif")
        
        # 不再使用 crop_tiff_by_polygon 方法
        # 改为使用 shapely 的 buffer、coverage_union_all 和 envelope 方法
        
        # 收集所有类型的点坐标
        all_points = []
        for type_id in type_ids:
            points = generate_point_coordinates_sam(labels_data, type_id)
            if points:
                all_points.extend(points)
        
        # 如果有点坐标，则计算裁剪范围
        if all_points:

            
            # 创建点的几何对象并添加缓冲区
            buffered_points = [buffer(Point(x, y), 0.0001) for x, y in all_points]
            
            # 合并所有缓冲区
            if len(buffered_points) > 1:
                merged_buffer = coverage_union_all(buffered_points)
            else:
                merged_buffer = buffered_points[0]
            
            # 获取最小边界框
            bbox = envelope(merged_buffer)
            
            # 获取边界框的坐标
            minx, miny, maxx, maxy = bbox.bounds
            
            # 打开原始影像
            with rasterio.open(IMAGE_PATH) as src:
                # 获取影像的边界范围
                img_bounds = src.bounds
                img_minx, img_miny, img_maxx, img_maxy = img_bounds
                
                # 将坐标从 EPSG:4326 转换为影像的坐标系统
                src_crs = src.crs
                dst_crs = "EPSG:4326"
                minx, miny, maxx, maxy = transform_bounds(dst_crs, src_crs, minx, miny, maxx, maxy)
                
                # 将边界框限制在影像范围内
                minx = max(minx, img_minx)
                miny = max(miny, img_miny)
                maxx = min(maxx, img_maxx)
                maxy = min(maxy, img_maxy)
                
                # 检查边界框是否有效（最小值不能大于最大值）
                if minx >= maxx or miny >= maxy:
                    print("警告: 边界框无效，使用原始影像进行处理")
                    temp_out = IMAGE_PATH
                else:
                    print(f"边界框已限制在影像范围内: ({minx}, {miny}, {maxx}, {maxy})")
                    print(f"影像范围: ({img_minx}, {img_miny}, {img_maxx}, {img_maxy})")
                    
                    # 计算窗口
                    window = from_bounds(minx, miny, maxx, maxy, src.transform)
                    
                    # 读取窗口内的数据
                    data = src.read(window=window)
                    
                    # 创建裁剪后的影像元数据
                    out_meta = src.meta.copy()
                    out_transform = rasterio.windows.transform(window, src.transform)
                    out_meta.update({
                        "height": window.height,
                        "width": window.width,
                        "transform": out_transform
                    })
                    
                    # 保存裁剪后的影像
                    with rasterio.open(temp_out, "w", **out_meta) as dst:
                        dst.write(data)
                    
                    print(f"已根据点坐标缓冲区裁剪影像到: {temp_out}")
        else:
            # 如果没有点坐标或不需要裁剪，直接使用原始影像
            temp_out = IMAGE_PATH
            print("使用原始影像进行处理")

        sam = copy.deepcopy(global_sam)
        # sam = global_sam
        sam.set_image(temp_out)

        # 用于存储所有 type_id 的分割结果
        all_segmentation_polygons = {}

        # 删除绘制的点数据
        delete_point_results_db(conn, TASK_ID)

        # 处理每个 type_id
        for type_id in type_ids:
            print(f"处理 type_id: {type_id}")
            point_4326 = generate_point_coordinates_sam(labels_data, type_id)
            if not point_4326:
                print(f"type_id {type_id} 没有找到多边形，跳过。")
                continue

            # 创建临时掩码文件
            with tempfile.NamedTemporaryFile(suffix='.tif', dir=temp_dir, delete=False) as mask_file:
                mask_path = mask_file.name
                
                # 创建点标签数组，全部设置为1（表示前景）
                point_labels = np.ones(len(point_4326), dtype=int)
                
                # 使用 SAM 进行预测，添加 point_labels 参数
                sam.predict_by_points(
                    point_coords_batch=point_4326, 
                    point_labels=point_labels,  # 添加点标签参数
                    point_crs="EPSG:4326", 
                    output=mask_path, 
                    dtype="uint8"
                )
                # global_sam.predict(point_coords=point_4326, point_labels=1, point_crs="EPSG:4326", output=mask_path)
                # print("2")
                # 读取掩码
                with rasterio.open(mask_path) as mask_src:
                    mask = mask_src.read(1)  # 假设掩码是单波段的

                # 应用后处理
                processed_mask = post_process_mask_sam(
                    mask,
                    min_object_size=int(argv[5]),
                    hole_size_threshold=int(argv[6]),
                    boundary_smoothing=int(argv[7])
                )

                # 保存处理后的掩码回 mask_path
                with rasterio.open(mask_path, 'w', **mask_src.meta) as dst:
                    dst.write(processed_mask, 1)

            # 矢量化掩膜
            with rasterio.open(temp_out) as src:
                transform = src.transform  # EPSG:3857 变换
            with rasterio.open(mask_path) as mask_src:
                mask = mask_src.read(1)
            segmentation_polygons = identify_holes_and_split_SAM(mask, transform, type_id)

            # 收集分割结果
            if segmentation_polygons:
                all_segmentation_polygons.update(segmentation_polygons)
            else:
                print(f"type_id {type_id} 未生成有效多边形。")

            # 删除临时掩膜文件
            os.remove(mask_path)
            print(f"已删除 {mask_path}")

        # 将所有分割结果写入数据库
        if all_segmentation_polygons:
            insert_segmentation_results_db(conn, TASK_ID, all_segmentation_polygons, user_id, status)
        else:
            print("没有生成任何分割多边形，未写入数据库。")

        # 清理资源
        sam = None
        torch.cuda.empty_cache()
        conn.close()


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)