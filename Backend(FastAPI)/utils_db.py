import psycopg2
import json
import numpy as np
from scipy.spatial import KDTree

# 数据库操作
def connect_db(host="localhost", dbname="label", user="postgres", password="123456", port="5432"):
    try:
        conn = psycopg2.connect(host=host, database=dbname, user=user, password=password, port=port)
        return conn
    except psycopg2.Error as e:
        print(f"Error connecting to the database: {e}")
        return None

def fetch_map_server_from_db(conn, task_id, table_name="task"):
    if conn is None:
        return []
    try:
        with conn.cursor() as cursor:
            query = f"SELECT map_server FROM {table_name} WHERE task_id = %s"
            cursor.execute(query, (task_id,))
            return cursor.fetchall()
    except psycopg2.Error as e:
        print(f"Error fetching map_server from database: {e}")
        return []
    
def save_model_to_db(conn, model_name, user_id, mapping, model_path, input_num, output_num,model_type, tasktype,table_name="model"):
    if conn is None:
        return
    try:
        with conn.cursor() as cursor:
            query = f"INSERT INTO {table_name} (model_name, user_id, model_des, path, input_num, output_num, status,model_type,task_type) VALUES (%s, %s, %s, %s, %s, %s, %s,%s,%s)"
            cursor.execute(query, (model_name, user_id, mapping, model_path, input_num, output_num, 0,model_type,tasktype))
            conn.commit()
            print("Model record inserted successfully.")
    except psycopg2.Error as e:
        print(f"Error saving model to database: {e}")
        conn.rollback()

def fetch_model_from_db(conn, model_name, table_name="model"):
    """
    从数据库中根据模型名称查找单条模型记录。

    Args:
        conn: 数据库连接对象。
        model_name: 要查找的模型名称。
        table_name: 数据库表名，默认为 "model"。

    Returns:
        如果找到匹配的记录，则返回一个字典，键为列名，值为对应的字段值。
        如果未找到记录、conn为None或发生数据库错误，则返回一个空字典 {}。
    """
    # 处理连接为 None 的情况，返回空字典表示没有结果/无法查询
    if conn is None:
        # print("Database connection is None.") # 可以选择打印警告
        return {}

    try:
        # 使用 with 语句确保 cursor 被正确关闭
        with conn.cursor() as cursor:
            # 构建 SQL 查询语句
            query = f"SELECT model_name, user_id, model_des, path, input_num, output_num, status,model_type FROM {table_name} WHERE model_name= %s"
            
            # 执行查询，使用参数化查询防止SQL注入
            cursor.execute(query, (model_name,))

            # 获取列名。cursor.description 是一个元组的元组，每个内层元组描述一个列。
            # 第一个元素 [0] 是列名。
            if cursor.description is None:
                # 如果查询没有返回结果集（例如 DELETE/UPDATE），description 会是 None
                # 对于 SELECT 应该有 description，这里做个简单检查
                print("Warning: cursor.description is None after SELECT.")
                return {}

            column_names = [desc[0] for desc in cursor.description]

            # 获取单条结果。fetchone() 返回一个元组或 None。
            row_data = cursor.fetchone()

            # 检查是否找到了记录
            if row_data is None:
                # 没有找到匹配的记录，返回空字典
                return {}
            else:
                # 找到了记录，将列名和数据组合成字典
                # 使用 zip 将列名和数据值配对，然后转换为字典
                result_dict = dict(zip(column_names, row_data))
                return result_dict

    except psycopg2.Error as e:
        # 捕获 psycopg2 相关的数据库错误
        print(f"Error fetching model from database: {e}")
        # 发生错误时返回空字典
        return {}
    except Exception as e:
        # 捕获其他可能的异常
        print(f"An unexpected error occurred: {e}")
        return {}


def match_typeid_to_name(conn, table_name = "type"):
    """
    从指定表中获取 type_id 和 type_name，并将其作为字典返回。

    Args:
        conn: psycopg2 数据库连接对象。
        table_name: 要查询的表名 (默认为 "type")。

    Returns:
        成功时返回一个字典 {type_id: type_name}。
        如果表为空，返回一个空字典 {}。
        如果数据库发生错误或 conn 为 None，返回一个空列表 []。
    """
    if conn is None:
        print("数据库连接对象 conn 为 None.")
        return []

    type_dict = {} # 默认返回空字典

    try:
        with conn.cursor() as cursor:
            # 移除 task_id 过滤，根据要求获取所有 type_id 和 type_name
            query = f"SELECT type_id, type_name FROM {table_name}"
            cursor.execute(query)

            # 获取所有结果
            rows = cursor.fetchall()

            # 将结果（列表中的元组）转换为字典
            # 假设 type_id 是第一列 (索引 0)，type_name 是第二列 (索引 1)
            type_dict = {row[0]: row[1] for row in rows}
            print(type_dict)

            return type_dict

    except psycopg2.Error as e:
        print(f"从数据库获取类型映射时发生错误: {e}")
        return [] # 错误时返回空列表，与原代码行为一致
    except Exception as e:
         print(f"发生未知错误: {e}")
         return [] # 捕获其他潜在错误

    

def fetch_typeid_from_db(conn, task_id, table_name="task_accepted"):
    if conn is None:
        return []
    try:
        with conn.cursor() as cursor:
            query = f"SELECT type_arr FROM {table_name} WHERE task_id = %s"
            cursor.execute(query, (task_id,))
            return cursor.fetchall()
    except psycopg2.Error as e:
        print(f"Error fetching type_id from database: {e}")
        return []
        

def fetch_labels_from_db(conn, task_id, table_name="mark", limit=1000, offset=0):
    if conn is None:
        return []
    try:
        with conn.cursor() as cursor:
            query = f"SELECT id, geom, type_id, user_id, task_id, status FROM {table_name} WHERE task_id = %s LIMIT %s OFFSET %s"
            cursor.execute(query, (task_id, limit, offset))
            temp_r = cursor.fetchall()
            result = []
            for row in temp_r:
                id, geom, type_id, user_id, task_id, status = row
                
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
                        try:
                            # 提取外环坐标并转换为二维 (x, y) 元组列表
                            exterior_coords = geom["geometry"]["coordinates"][0]
                            ex_point = []
                            for coord in exterior_coords:
                                if len(coord) >= 2:  # 确保至少有 x, y
                                    ex_point.append((float(coord[0]), float(coord[1])))  # 只取 x, y
                                else:
                                    raise ValueError(f"Invalid exterior coordinate: {coord}")

                            # 检查外环是否有效（至少3个点）
                            if len(ex_point) < 3:
                                raise ValueError(f"Exterior ring has fewer than 3 points: {ex_point}")

                            # 提取内环坐标并转换为二维 (x, y) 元组列表
                            interior_coords_list = []
                            for ring in geom["geometry"]["coordinates"][1:]:
                                ring_coords = []
                                for coord in ring:
                                    if len(coord) >= 2:  # 确保至少有 x, y
                                        ring_coords.append((float(coord[0]), float(coord[1])))  # 只取 x, y
                                    else:
                                        raise ValueError(f"Invalid interior coordinate: {coord}")
                                # 检查内环是否有效（至少3个点）
                                if len(ring_coords) >= 3:
                                    interior_coords_list.append(ring_coords)
                                else:
                                    print(f"Warning: Skipping invalid interior ring with fewer than 3 points: {ring_coords}")

                            # 调用 connect_multiple_holes
                            point_list = connect_multiple_holes(ex_point, interior_coords_list)

                            # 验证 point_list 是否有效
                            if not point_list or len(point_list) < 3:
                                raise ValueError(f"connect_multiple_holes returned invalid point list: {point_list}")

                            # 将元组列表展平为一维列表
                            flattened = [item for tup in point_list for item in tup]

                            # 将列表元素转换为字符串并用逗号连接
                            geom_str = ','.join(str(item) for item in flattened)

                        except Exception as e:
                            print(f"Error processing polygon with holes: {e}, geom: {geom}")
                            # 跳过无效的多边形，继续处理下一个
                            continue
                elif geom["geometry"]["type"] == "Point":
                    # 处理点标注
                    point_coords = geom["geometry"]["coordinates"]
                    geom_str = ','.join(map(str, point_coords))

                # 添加到结果
                result.append((id, geom_str, type_id, user_id, task_id, status))
                    
            # print(result)
            return result

    except psycopg2.Error as e:
        print(f"Error fetching labels from database: {e}")
        return []
    
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


def delete_existing_results_db(conn, task_id, table_name="mark", batch_size=1000):
    if conn is None:
        return
    try:
        with conn.cursor() as cursor:
            # 获取最小和最大 id，逐步删除
            cursor.execute(f"SELECT MIN(id), MAX(id) FROM {table_name} WHERE task_id = %s", (task_id,))
            min_id, max_id = cursor.fetchone()
            if min_id is None or max_id is None:
                print(f"没有找到 task_id {task_id} 的数据，无需删除。")
                return

            # 分批删除
            current_min_id = min_id
            while current_min_id <= max_id:
                delete_query = f"""
                    DELETE FROM {table_name}
                    WHERE task_id = %s
                    AND id >= %s
                    AND id < %s + %s
                """
                cursor.execute(delete_query, (task_id, current_min_id, current_min_id, batch_size))
                conn.commit()
                current_min_id += batch_size
                if cursor.rowcount == 0:
                    break
            print(f"已删除 task_id {task_id} 的原有数据。")
    except psycopg2.Error as e:
        print(f"Error deleting existing results from database: {e}")
        conn.rollback()


def delete_point_results_db(conn, task_id, table_name="mark"):
    # 检查数据库连接是否有效
    if conn is None:
        return
    
    # 创建游标对象
    cursor = conn.cursor()
    
    try:
        # 修改 SQL 查询：删除 task_id 匹配且 geom 为点标注的记录
        # 使用 JSON 操作符 ->> 来查询 JSON 字段中的值
        delete_query = f"""
            DELETE FROM {table_name}
            WHERE task_id = %s
            AND (geom::jsonb->'geometry'->>'type' = 'Point') 
        """
        # 执行删除操作，使用参数化查询防止 SQL 注入
        cursor.execute(delete_query, (task_id,))
        # 提交事务
        conn.commit()
        print(f"已删除 task_id {task_id} 的点标注数据。")
    
    except psycopg2.Error as e:
        # 捕获数据库错误并回滚事务
        print(f"Error deleting point results from database: {e}")
        conn.rollback()
    
    finally:
        # 关闭游标
        cursor.close()

from psycopg2.extras import execute_values

def insert_segmentation_results_db(conn, task_id, segmentation_polygons, user_id, status, table_name="mark", batch_size=1000):
    if conn is None:
        return
    try:
        with conn.cursor() as cursor:
            # 将多边形数据格式化为Feature GeoJSON格式，包含孔洞信息
            values_list = []
            for type_id, polygons in segmentation_polygons.items():
                for polygon in polygons:
                    # 检查多边形是否有效
                    if not polygon.is_valid:
                        print(f"警告：发现无效多边形，type_id={type_id}，尝试修复...")
                        polygon = polygon.buffer(0)  # 尝试修复无效多边形
                        if not polygon.is_valid:
                            print(f"无法修复多边形，跳过此多边形")
                            continue
                    
                    # 检查是否为MultiPolygon，如果是则处理每个子多边形
                    if polygon.geom_type == 'MultiPolygon':
                        print(f"处理MultiPolygon，包含 {len(polygon.geoms)} 个子多边形")
                        for geom in polygon.geoms:
                            if not geom.is_valid:
                                print(f"警告：发现无效子多边形，type_id={type_id}，尝试修复...")
                                geom = geom.buffer(0)
                                if not geom.is_valid:
                                    print(f"无法修复子多边形，跳过此子多边形")
                                    continue
                            
                            # 确保子多边形有足够的点
                            if len(geom.exterior.coords) < 4:  # 至少需要3个点形成闭环
                                print(f"警告：子多边形点数不足，type_id={type_id}，跳过此子多边形")
                                continue
                            
                            # 创建新格式的GeoJSON
                            geometry = {
                                "type": "Polygon",
                                "coordinates": [list(geom.exterior.coords)]
                            }
                            
                            # 如果有孔洞，添加到coordinates中
                            if geom.interiors:
                                geometry["coordinates"].extend([list(interior.coords) for interior in geom.interiors])
                            
                            # 创建新格式的Feature GeoJSON
                            geojson = {
                                "type": "Feature",
                                "properties": {},
                                "geometry": geometry
                            }
                            
                            # 确保将GeoJSON作为有效的JSON字符串插入数据库
                            values_list.append((
                                json.dumps(geojson),
                                int(type_id),
                                user_id,
                                task_id,
                                status
                            ))
                    else:  # 单个Polygon的处理
                        # 确保多边形有足够的点
                        if len(polygon.exterior.coords) < 4:  # 至少需要3个点形成闭环
                            print(f"警告：多边形点数不足，type_id={type_id}，跳过此多边形")
                            continue
                        
                        # 创建新格式的GeoJSON
                        geometry = {
                            "type": "Polygon",
                            "coordinates": [list(polygon.exterior.coords)]
                        }
                        
                        # 如果有孔洞，添加到coordinates中
                        if polygon.interiors:
                            geometry["coordinates"].extend([list(interior.coords) for interior in polygon.interiors])
                        
                        # 创建新格式的Feature GeoJSON
                        geojson = {
                            "type": "Feature",
                            "properties": {},
                            "geometry": geometry
                        }
                        
                        # 确保将GeoJSON作为有效的JSON字符串插入数据库
                        values_list.append((
                            json.dumps(geojson),
                            int(type_id),
                            user_id,
                            task_id,
                            status
                        ))
            
            if values_list:
                # 在插入操作前提交当前事务，避免事务内部冲突
                conn.commit()
                # 关闭自动提交，开始新事务
                conn.autocommit = False
                query = f"INSERT INTO {table_name} (geom, type_id, user_id, task_id, status) VALUES %s"
                # 分批插入数据
                for i in range(0, len(values_list), batch_size):
                    batch = values_list[i:i + batch_size]
                    execute_values(cursor, query, batch)
                # 提交插入操作的事务
                conn.commit()
                print(f"分割结果已成功写入数据库 task_id {task_id}，使用 user_id: {user_id}")
            else:
                print("没有生成任何分割多边形，未写入数据库。")
    except Exception as e:
        # 出错时回滚事务
        conn.rollback()
        print(f"写入数据库时出错: {e}")