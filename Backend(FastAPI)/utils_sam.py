import os
import rasterio
from rasterio.features import shapes
from shapely.geometry import Polygon, mapping
from pyproj import Transformer
import numpy as np
import cv2
from skimage.morphology import label, remove_small_objects
from rasterio.mask import mask
from utils import parse_model_scope


# SAM模型处理
# SAM_BOX
# Coordinate transformation setup
TRANSFORMER_3857_TO_4326 = Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True)
TRANSFORMER_4326_TO_3857 = Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)

def generate_bounding_boxes(labels_data, type_id):
    """Generate bounding boxes for polygons of a specific type_id, transforming to EPSG:4326."""
    boxes_3857 = []
    boxes_4326 = []
    for _, geom_str, tid, *_ in labels_data:
        if tid != type_id:
            continue
        try:
            coords_str_list = geom_str.split(',')
            # 检查是否为有效的坐标字符串数组
            if len(coords_str_list) >= 6 and all(c.strip().replace('.', '', 1).replace('-', '', 1).isdigit() or c.strip() == '' for c in coords_str_list):
                coords_list = []
                for i in range(0, len(coords_str_list), 2):
                    if i + 1 < len(coords_str_list):  # 确保有足够的元素获取一对坐标
                        try:
                            x = float(coords_str_list[i].strip())
                            y = float(coords_str_list[i+1].strip())
                            coords_list.append((x, y))
                        except ValueError:
                            continue  # 跳过无法转换为浮点数的坐标对
                
                if len(coords_list) >= 3:  # 确保有足够的点形成多边形
                    polygon = Polygon(coords_list)
                    if polygon.is_valid:
                        minx, miny, maxx, maxy = polygon.bounds
                        boxes_3857.append([minx, miny, maxx, maxy])  # Keep in EPSG:3857 for reference
                        # Transform to EPSG:4326 for SAM prediction
                        minx_4326, miny_4326 = TRANSFORMER_3857_TO_4326.transform(minx, miny)
                        maxx_4326, maxy_4326 = TRANSFORMER_3857_TO_4326.transform(maxx, maxy)
                        boxes_4326.append([minx_4326, miny_4326, maxx_4326, maxy_4326])  # Format: [left, bottom, right, top]
        except Exception as e:
            print(f"Error processing geometry string: {e}, geom_str: {geom_str[:50]}...")
            continue
    return boxes_4326  # Return EPSG:4326 boxes for SAM

def identify_holes_and_split_SAM(mask, transform, type_id):
    """
    Convert mask to polygons with holes preserved in the polygon structure.
    
    Parameters:
        mask: Binary mask as numpy array
        transform: Coordinate transformation function
        type_id: The type ID to assign to the polygons
    
    Returns:
        Dictionary mapping type_id to a list of polygons with preserved holes
    """
    polygons = {}
    class_mask = mask.astype(np.uint8)
    contours, hierarchy = cv2.findContours(class_mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    if hierarchy is None or len(contours) == 0:
        return polygons

    class_polygons = []
    i = 0
    while i < len(contours):
        if hierarchy[0][i][3] == -1:  # Is exterior contour (no parent)
            exterior_coords = [transform * (point[0][0], point[0][1]) for point in contours[i]]
            exterior_coords = [(x, y) for x, y in exterior_coords]
            
            # Find all holes for this exterior contour
            interior_rings = []
            hole_idx = hierarchy[0][i][2]  # Index of first child (hole)
            while hole_idx != -1:
                if len(contours[hole_idx]) >= 3:
                    interior_coords = [transform * (point[0][0], point[0][1]) for point in contours[hole_idx]]
                    interior_coords = [(x, y) for x, y in interior_coords]
                    interior_rings.append(interior_coords)
                hole_idx = hierarchy[0][hole_idx][0]  # Move to next hole at same level
            
            try:
                # Create polygon with holes
                if interior_rings:
                    polygon = Polygon(exterior_coords, holes=interior_rings)
                else:
                    polygon = Polygon(exterior_coords)
                
                class_polygons.append(polygon)
            except Exception as e:
                print(f"创建多边形时出错: {e}")
        i += 1
    
    if class_polygons:
        polygons[type_id] = class_polygons
    return polygons

#   SAM
def crop_tiff_by_polygon(input_tiff_path, output_tiff_path, model_scope_str):
    """
    根据多边形范围裁剪TIFF影像
    
    参数:
    input_tiff_path: 输入TIFF文件路径
    output_tiff_path: 输出TIFF文件路径
    model_scope_str: JSON格式的多边形坐标字符串
    
    返回:
    bool: 裁剪成功返回True，否则返回False
    """
    try:
        # 解析多边形
        polygons = parse_model_scope(model_scope_str)
        if not polygons:
            print("No valid polygons found in the model scope.")
            return False
            
        # 将Shapely多边形转换为GeoJSON格式
        geoms = [mapping(polygon) for polygon in polygons]
            
        # 打开栅格数据
        with rasterio.open(input_tiff_path) as src:
            # 执行裁剪
            out_image, out_transform = mask(src, geoms, crop=True, all_touched=True)
            
            # 获取元数据
            out_meta = src.meta.copy()
            
            # 更新元数据
            out_meta.update({
                "driver": "GTiff",
                "height": out_image.shape[1],
                "width": out_image.shape[2],
                "transform": out_transform
            })
            
            # 创建输出目录(如果不存在)
            output_dir = os.path.dirname(output_tiff_path)
            if output_dir and not os.path.exists(output_dir):
                os.makedirs(output_dir)
                
            # 保存裁剪后的栅格
            with rasterio.open(output_tiff_path, "w", **out_meta) as dest:
                dest.write(out_image)
                
            print(f"Successfully cropped image to {output_tiff_path}")
            return True
            
    except Exception as e:
        print(f"Error cropping TIFF: {e}")
        return False


def post_process_mask_sam(mask, min_object_size=10, hole_size_threshold=20, boundary_smoothing=3):
    """
    对输入的二值掩码进行后处理，包括移除小对象、填充小孔洞、平滑边界和众数滤波。
    
    参数：
        mask: 输入的二值掩码，numpy 数组，uint8 类型，0 为背景，1 为前景
        min_object_size: 最小对象面积阈值，小于此值的对象将被移除
        hole_size_threshold: 小孔洞面积阈值，小于此值的孔洞将被填充
        boundary_smoothing: 形态学平滑的核大小
        mode_filter_size: 众数滤波的窗口大小
    
    返回：
        processed_mask: 处理后的二值掩码，numpy 数组，uint8 类型
    """
    # 复制原始掩码
    original_mask = mask.copy().astype(np.uint8)
    
    
    labeled_mask, num_labels = label(original_mask, return_num=True)

    # 使用Numba移除小对象
    labeled_mask = remove_small_objects(labeled_mask, min_object_size)
    cleaned_mask = (labeled_mask > 0).astype(np.uint8)

    # 填充小孔
    filled_mask = cleaned_mask.copy()
    contours, hierarchy = cv2.findContours(cleaned_mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    for i, contour in enumerate(contours):
        if hierarchy[0][i][3] != -1:  # 如果有父轮廓，说明是内部孔洞
            area = cv2.contourArea(contour)
            if 0 < area < hole_size_threshold:
                cv2.drawContours(filled_mask, [contour], 0, 1, -1)
    # filled_mask = cleaned_mask.copy()
    # contours, _ = cv2.findContours(cleaned_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    # for contour in contours:
    #     temp_mask = np.zeros_like(cleaned_mask)
    #     cv2.drawContours(temp_mask, [contour], 0, 1, -1)
    #     temp_mask_inv = 1 - temp_mask
    #     holes = label(temp_mask_inv)
    #     hole_props = regionprops(holes)
    #     for hole in hole_props:
    #         if 0 < hole.area < hole_size_threshold:
    #             filled_mask[holes == hole.label] = 1

    # 形态学平滑
    kernel = np.ones((boundary_smoothing, boundary_smoothing), np.uint8)
    smoothed_mask = cv2.morphologyEx(filled_mask, cv2.MORPH_CLOSE, kernel)
    smoothed_mask = cv2.morphologyEx(smoothed_mask, cv2.MORPH_OPEN, kernel)

    return smoothed_mask

def generate_point_coordinates_sam(labels_data, type_id):
    """Generate point coordinates for polygons of a specific type_id, transforming to EPSG:4326."""
    point_coords = []
    for _, geom_str, tid, *_ in labels_data:
        if tid != type_id:
            continue
        try:
            coords_str_list = geom_str.split(',')
            # 检查是否为点坐标（只有两个值）
            if len(coords_str_list) == 2 and all(c.strip().replace('.', '', 1).replace('-', '', 1).isdigit() or c.strip() == '' for c in coords_str_list):
                try:
                    x = float(coords_str_list[0].strip())
                    y = float(coords_str_list[1].strip())
                    lon, lat = TRANSFORMER_3857_TO_4326.transform(x, y)
                    point_coords.append([lon, lat])
                except ValueError as e:
                    print(f"坐标转换错误: {e}, coords: {coords_str_list}")
                    continue
            # 对于多边形，可以考虑从中提取中心点或特定点
            # 这部分代码已被注释掉，如有需要可以取消注释并添加错误处理
            # for i in range(0, len(coords_str_list), 2):
            #     if i + 1 < len(coords_str_list):
            #         try:
            #             x = float(coords_str_list[i].strip())
            #             y = float(coords_str_list[i+1].strip())
            #             lon, lat = TRANSFORMER_3857_TO_4326.transform(x, y)
            #             point_coords.append([lon, lat])
            #         except ValueError:
            #             continue
        except Exception as e:
            print(f"处理几何字符串时出错: {e}, geom_str: {geom_str[:50]}...")
            continue
    return point_coords  # Return list of [lon, lat] pairs in EPSG:4326
