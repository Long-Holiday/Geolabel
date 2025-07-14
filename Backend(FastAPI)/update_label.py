import os
import sys
import psycopg2
import rasterio
import numpy as np
from shapely.geometry import Polygon
from psycopg2.extras import execute_values

from utils import identify_holes_and_split
from utils_db import connect_db, fetch_labels_from_db, insert_segmentation_results_db
# from utils import connect_db, fetch_labels_from_db, identify_holes_and_split, insert_segmentation_results_db  # 假设这是处理掩膜并生成多边形的工具函数

# 数据库连接信息（请替换为实际值）
DB_HOST = "localhost"
DB_NAME = "label"
DB_USER = "postgres"
DB_PASSWORD = "123456"
DB_PORT = "5432"
TABLE_NAME = "mark"
TABLE_NAME2 = "task"

# -------------------- 数据库操作函数 --------------------
# def connect_db():
#     """连接到PostgreSQL数据库"""
#     try:
#         conn = psycopg2.connect(
#             host=DB_HOST,
#             database=DB_NAME,
#             user=DB_USER,
#             password=DB_PASSWORD,
#             port=DB_PORT
#         )
#         return conn
#     except psycopg2.Error as e:
#         print(f"Error connecting to the database: {e}")
#         return None

def fetch_map_server_from_db(conn, task_id):
    """从数据库中获取地图服务器路径"""
    if conn is None:
        return []
    try:
        cursor = conn.cursor()
        query = f"SELECT map_server FROM {TABLE_NAME2} WHERE task_id = %s"
        cursor.execute(query, (task_id,))
        map_server = cursor.fetchall()
        cursor.close()
        return map_server
    except psycopg2.Error as e:
        print(f"Error fetching map_server from database: {e}")
        return []

# def fetch_labels_from_db(conn, task_id):
#     """从数据库中获取指定 task_id 的标签数据"""
#     if conn is None:
#         return []
#     try:
#         cursor = conn.cursor()
#         query = f"SELECT id, geom, type_id, user_id, task_id, status FROM {TABLE_NAME} WHERE task_id = %s ORDER BY id ASC"
#         cursor.execute(query, (task_id,))
#         labels_data = cursor.fetchall()
#         cursor.close()
#         return labels_data
#     except psycopg2.Error as e:
#         print(f"Error fetching labels from database: {e}")
#         return []

def delete_existing_results_db(conn, task_id):
    """删除数据库中指定 task_id 的原有数据"""
    if conn is None:
        return
    cursor = conn.cursor()
    try:
        delete_query = f"DELETE FROM {TABLE_NAME} WHERE task_id = %s"
        cursor.execute(delete_query, (task_id,))
        conn.commit()
        print(f"已删除 task_id {task_id} 的原有数据。")
    except psycopg2.Error as e:
        print(f"Error deleting existing results from database: {e}")
        conn.rollback()
    finally:
        cursor.close()

# def insert_segmentation_results_db(conn, task_id, segmentation_polygons, user_id, status):
#     """将矢量化结果批量写入数据库"""
#     if conn is None:
#         return
#     cursor = conn.cursor()
#     values = [
#         (', '.join(f"{x}, {y}" for x, y in polygon.exterior.coords), int(type_id), user_id, task_id, status)
#         for type_id, polygons in segmentation_polygons.items()
#         for polygon in polygons
#     ]
#     if values:
#         execute_values(
#             cursor,
#             f"INSERT INTO {TABLE_NAME} (geom, type_id, user_id, task_id, status) VALUES %s",
#             values
#         )
#         conn.commit()
#         print(f"矢量化结果已成功写入数据库 task_id {task_id}，使用 user_id: {user_id}")
#     else:
#         print("没有生成任何多边形，未写入数据库。")
#     cursor.close()

# -------------------- 掩膜生成函数 --------------------
def create_label_mask(labels_data, transform, img_height, img_width, background_class_index, type_id_to_class_index):
    """根据标签数据创建标签掩膜，按 id 顺序构建，背景样本（type_id=0）最后覆盖"""
    mask = np.full((img_height, img_width), background_class_index, dtype=np.uint8)
    
    # 按照 id 升序排序标签数据
    labels_data_sorted = sorted(labels_data, key=lambda x: x[0])
    
    # 分离背景样本和普通样本
    background_samples = []
    normal_samples = []
    
    for id, geom_str, type_id, *_ in labels_data_sorted:
        if type_id == 0:  # 背景样本
            background_samples.append((id, geom_str, type_id))
        else:  # 普通样本
            normal_samples.append((id, geom_str, type_id))
    
    # 先处理普通样本
    shapes = []
    for id, geom_str, type_id in normal_samples:
        class_index = type_id_to_class_index.get(type_id)
        if class_index is None:
            continue
        try:
            coords_str_list = geom_str.split(',')
            coords_list = [(float(x.strip()), float(y.strip()))
                           for x, y in zip(coords_str_list[::2], coords_str_list[1::2])]
            polygon = Polygon(coords_list)
            shapes.append((polygon, int(class_index)))
        except (ValueError, IndexError) as e:
            print(f"处理几何字符串时出错: {e}, geom_str: {geom_str}")
            continue

    # 光栅化普通样本
    if shapes:
        mask = rasterio.features.rasterize(
            shapes=shapes,
            out_shape=(img_height, img_width),
            fill=background_class_index,
            transform=transform,
            all_touched=True,
            dtype=np.uint8
        )
    
    # 最后处理背景样本，将这些区域重置为背景
    for id, geom_str, type_id in background_samples:
        try:
            coords_str_list = geom_str.split(',')
            coords_list = [(float(x.strip()), float(y.strip()))
                           for x, y in zip(coords_str_list[::2], coords_str_list[1::2])]
            polygon = Polygon(coords_list)
            
            # 将背景样本区域重置为背景类别
            background_mask = rasterio.features.rasterize(
                shapes=[(polygon, 1)],  # 临时使用1作为标记
                out_shape=(img_height, img_width),
                fill=0,
                transform=transform,
                all_touched=True,
                dtype=np.uint8
            )
            
            # 将标记为1的区域重置为背景类别
            mask = np.where(background_mask == 1, background_class_index, mask)
            print(f"背景样本 {id} 已应用，消除了标错区域")
            
        except (ValueError, IndexError) as e:
            print(f"处理背景样本几何字符串时出错: {e}, geom_str: {geom_str}")
            continue

    return mask
# -------------------- 主函数 --------------------
def update_label_function(argv):
    """主函数：处理任务并更新标签"""
    TASK_ID = int(argv[1])
    MAPFILE_PATH = argv[2]
    
    # 连接数据库
    # conn = db_conn
    conn = connect_db()
    if conn is None:
        print("无法连接到数据库，程序退出。")
        return
    
    # 获取地图服务器路径
    map_servers = fetch_map_server_from_db(conn, TASK_ID)
    if not map_servers:
        print(f"task_id {TASK_ID} 未找到地图服务器路径，请检查数据库。")
        conn.close()
        return
    map_name = map_servers[0][0]
    IMAGE_PATH = f"{MAPFILE_PATH}/{map_name}.tif"
    
    # 获取标签数据
    labels_data = fetch_labels_from_db(conn, TASK_ID)
    # print(f"labels_data: {labels_data}")
    if not labels_data:
        print(f"task_id {TASK_ID} 没有找到标签数据，请检查数据库。")
        conn.close()
        return
    
    user_id = labels_data[0][3]  # 从第一条记录获取 user_id
    status = labels_data[0][5]   # 从第一条记录获取 status
    
    # 读取影像元数据
    try:
        with rasterio.open(IMAGE_PATH) as src:
            transform = src.transform
            img_height, img_width = src.height, src.width
            crs = src.crs
            if crs != 'EPSG:3857':
                print(f"警告: 图像坐标系为 {crs}，不是 EPSG:3857，可能导致掩膜生成错误！")
    except rasterio.RasterioIOError as e:
        print(f"Error loading image: {e}")
        conn.close()
        return
    
    # 设置掩膜参数
    background_class_index = 0
    # 过滤掉背景类型（type_id=0），只为非背景类型分配类别索引
    type_ids_from_db = sorted(list(set(row[2] for row in labels_data if row[2] != 0)))
    type_id_to_class_index = {type_id: idx + 1 for idx, type_id in enumerate(type_ids_from_db)}
    class_index_to_type_id = {idx: type_id for type_id, idx in type_id_to_class_index.items()}
    
    print(f"类型映射: {type_id_to_class_index}")
    print(f"背景类别索引: {background_class_index}")
    
    # 检查是否有背景样本
    background_samples = [row for row in labels_data if row[2] == 0]
    if background_samples:
        print(f"发现 {len(background_samples)} 个背景样本，将用于消除标错区域")
    
    # 生成掩膜
    mask = create_label_mask(labels_data, transform, img_height, img_width, background_class_index, type_id_to_class_index)
    
    # 处理掩膜并生成多边形（假设 utils 模块提供此功能）
    segmentation_polygons = identify_holes_and_split(mask, transform, class_index_to_type_id, background_class_index)
    
    # 更新数据库
    delete_existing_results_db(conn, TASK_ID)
    insert_segmentation_results_db(conn, TASK_ID, segmentation_polygons, user_id, status)
    
    conn.close()
    print("任务完成!")

if __name__ == "__main__":
    update_label_function(sys.argv)

