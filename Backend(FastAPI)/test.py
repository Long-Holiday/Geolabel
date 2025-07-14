# import psycopg2 # 确保导入了 psycopg2 库

# def fetch_model_from_db(conn, model_name, table_name="model"):
#     """
#     从数据库中根据模型名称查找单条模型记录。

#     Args:
#         conn: 数据库连接对象。
#         model_name: 要查找的模型名称。
#         table_name: 数据库表名，默认为 "model"。

#     Returns:
#         如果找到匹配的记录，则返回一个字典，键为列名，值为对应的字段值。
#         如果未找到记录、conn为None或发生数据库错误，则返回一个空字典 {}。
#     """
#     # 处理连接为 None 的情况，返回空字典表示没有结果/无法查询
#     if conn is None:
#         # print("Database connection is None.") # 可以选择打印警告
#         return {}

#     try:
#         # 使用 with 语句确保 cursor 被正确关闭
#         with conn.cursor() as cursor:
#             # 构建 SQL 查询语句
#             query = f"SELECT model_name, user_id, model_des, path, input_num, output_num, status,model_type FROM {table_name} WHERE model_name= %s"
            
#             # 执行查询，使用参数化查询防止SQL注入
#             cursor.execute(query, (model_name,))

#             # 获取列名。cursor.description 是一个元组的元组，每个内层元组描述一个列。
#             # 第一个元素 [0] 是列名。
#             if cursor.description is None:
#                 # 如果查询没有返回结果集（例如 DELETE/UPDATE），description 会是 None
#                 # 对于 SELECT 应该有 description，这里做个简单检查
#                 print("Warning: cursor.description is None after SELECT.")
#                 return {}

#             column_names = [desc[0] for desc in cursor.description]

#             # 获取单条结果。fetchone() 返回一个元组或 None。
#             row_data = cursor.fetchone()

#             # 检查是否找到了记录
#             if row_data is None:
#                 # 没有找到匹配的记录，返回空字典
#                 return {}
#             else:
#                 # 找到了记录，将列名和数据组合成字典
#                 # 使用 zip 将列名和数据值配对，然后转换为字典
#                 result_dict = dict(zip(column_names, row_data))
#                 return result_dict

#     except psycopg2.Error as e:
#         # 捕获 psycopg2 相关的数据库错误
#         print(f"Error fetching model from database: {e}")
#         # 发生错误时返回空字典
#         return {}
#     except Exception as e:
#         # 捕获其他可能的异常
#         print(f"An unexpected error occurred: {e}")
#         return {}
    
# def fetch_labels_from_db(conn, task_id, table_name="mark", limit=1000, offset=0):
#     if conn is None:
#         return []
#     try:
#         with conn.cursor() as cursor:
#             query = f"SELECT id, geom, type_id, user_id, task_id, status FROM {table_name} WHERE task_id = %s LIMIT %s OFFSET %s"
#             cursor.execute(query, (task_id, limit, offset))
#             return cursor.fetchall()
#     except psycopg2.Error as e:
#         print(f"Error fetching labels from database: {e}")
#         return []

# # # 示例用法 (假设你有一个数据库连接 conn)
# from utils import connect_db
# conn = connect_db() # 获取数据库连接

# if conn:
#     result = fetch_labels_from_db(conn, 133, limit=10, offset=0)
#     print(result) # 打印结果
#     print(type(result)) # 打印类型
#     # model_info = fetch_model_from_db(conn, "test3")
    
#     # if model_info:
#     #     print("找到模型信息:")
#     #     print(model_info) # 打印字典
#     #     print(f"Model Name: {model_info.get('model_name')}")
#     #     print(f"User ID: {model_info.get('user_id')}")
#     # else:
#     #     print(f"未找到模型 'MyTestModel' 或发生错误。")
        
#     conn.close() # 使用完连接后关闭
# else:
#     print("无法获取数据库连接。")
import numpy as np
from scipy.spatial import KDTree
from shapely import Point


def connect_multiple_holes(exterior_coords, interior_coords_list):
    """
    将多个内环连接到外环，使用 KD 树找到内环与外环的最近点对。
    
    参数:
        exterior_coords: 外环坐标列表，例如 [(x1, y1), (x2, y2), ...]
        interior_coords_list: 内环坐标列表的列表，例如 [[(x1, y1), ...], [(x2, y2), ...]]
    
    返回:
        连接所有内环后的外环坐标列表
    """
    # 简化内外环坐标(每隔1个点保留一个点)
    # simplified_exterior = exterior_coords[::2]
    # simplified_interior_list = [interior[::2] for interior in interior_coords_list]
    
    # 初始化当前外环
    simplified_exterior = exterior_coords
    simplified_interior_list = [interior for interior in interior_coords_list]
    current_exterior = simplified_exterior[:]
    
    # 遍历每个内环
    for interior_coords in simplified_interior_list:
        # 将当前外环坐标转换为 NumPy 数组，用于 KD 树
        exterior_points = np.array(current_exterior)
        # 构建 KD 树
        kd_tree = KDTree(exterior_points)
        
        # 初始化最小距离和最佳连接点索引
        min_dist = float('inf')
        best_exterior_idx = 0
        best_interior_idx = 0
        
        # 遍历内环上的每个点
        for i, interior_point in enumerate(interior_coords):
            # 使用 KD 树查询距离外环最近的点
            dist, nearest_idx = kd_tree.query(interior_point)
            if dist < min_dist:
                min_dist = dist
                best_exterior_idx = nearest_idx
                best_interior_idx = i
        
        # 将内环连接到外环
        interior_part = interior_coords[best_interior_idx:] + interior_coords[:best_interior_idx]
        new_exterior = (current_exterior[:best_exterior_idx + 1] + 
                        interior_part + 
                        [interior_coords[best_interior_idx]] + 
                        current_exterior[best_exterior_idx:])
        current_exterior = new_exterior
    
    return current_exterior

# exterior_coords = [(0.0, 0.0), (4.0, 0.0), (4.0, 4.0), (0.0, 4.0), (0.0, 0.0)]
# interior_coords_list = [
#     [(1.0, 1.0), (2.0, 1.0), (2.0, 2.0), (1.0, 2.0), (1.0, 1.0)],  # 一个小洞
#     [(3.0, 3.0), (3.5, 3.0), (3.5, 3.5), (3.0, 3.5), (3.0, 3.0)]   # 第二个洞
# ]


# # 调用函数
# result = connect_multiple_holes(exterior_coords, interior_coords_list)
# print(result)  # 打印结果
geom = {"geometry":{"coordinates":[[[12714690.069967654,3602394.6149909594],[12714946.13396867,3602394.6149909594],[12714946.13396867,3602496.8494871324],[12714690.069967654,3602496.8494871324],[12714690.069967654,3602394.6149909594]]],"type":"Polygon"},"type":"Feature","properties":{}}
# geom = {"geometry":{"coordinates":[[[12714740.511730619,3602486.8338048584],[12714740.511730619,3602380.3383753034],[12714930.520271337,3602380.3383753034],[12714930.520271337,3602486.8338048584],[12714740.511730619,3602486.8338048584]],[[12714809.514832249,3602461.8348777327],[12714810.014854724,3602462.334856275],[12714896.018720523,3602462.334856275],[12714896.518742997,3602461.8348777327],[12714896.518742997,3602414.8368947366],[12714896.018720523,3602414.3369161943],[12714810.014854724,3602414.3369161943],[12714809.514832249,3602414.8368947366],[12714809.514832249,3602461.8348777327]]],"type":"Polygon"},"type":"Feature","properties":{}}
result = []
if geom["geometry"]["type"] == "Polygon":
    if len(geom["geometry"]["coordinates"]) == 1:
        flattened = []
        point_list = geom["geometry"]["coordinates"][0]
        # 遍历最外层列表
        for outer in point_list:
            for item in outer:
                flattened.append(str(item))
        
        # 使用逗号连接列表中的元素
        geom_str = ','.join(flattened)
    else:
        ex_point = [tuple(inner_list) for inner_list in geom["geometry"]["coordinates"][0]]
        in_point = [[tuple(inner) for inner in ring] for ring in geom["geometry"]["coordinates"][1:]]
        point_list = connect_multiple_holes(ex_point, in_point)
        # 将元组列表展平为一维列表
        flattened = [item for tup in point_list for item in tup]
        
        # 将列表元素转换为字符串并用逗号连接
        geom_str = ','.join(str(item) for item in flattened)
    
    result.append((1,geom_str))


def filter_labels_by_scope(labels_data, model_scope_polygons):
    if not model_scope_polygons:
        return labels_data  # 如果没有范围，保留所有标注

    filtered_labels = []
    for label in labels_data:
        geom_str = label[0]  # 假设 geom_str 是坐标字符串
        coords_str_list = geom_str.split(',')
        coords_list = [(float(coords_str_list[i].strip()), float(coords_str_list[i+1].strip())) 
                       for i in range(0, len(coords_str_list), 2)]
        # 检查多边形的任意一点是否在模型作用范围内
        if any(any(Point(x, y).within(poly) for poly in model_scope_polygons) 
               for x, y in coords_list):
            filtered_labels.append(label)
    return filtered_labels
print(result)
print(filter_labels_by_scope(result, []))