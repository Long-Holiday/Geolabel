# utils.py
import json
import os
import shutil
import psycopg2
import rasterio
from rasterio.windows import Window, from_bounds
from shapely import MultiPolygon, unary_union
from shapely.geometry import Polygon, Point, mapping
import matplotlib.pyplot as plt
import cv2
from skimage.measure import regionprops, label
import torch
from torch.utils.data import Dataset, DataLoader
import rasterio.features
from scipy.stats import mode
import numpy as np
from PIL import Image
# from rasterio.crs import CRS
from scipy.ndimage import generic_filter
from pyproj import Transformer
from scipy.ndimage import label as scipy_label
from rasterio.mask import mask
import torchvision.transforms as T
import torchvision.transforms.functional as TF
from numba import jit
from scipy.spatial import KDTree


def parse_model_scope(model_scope_str):
    """解析模型作用范围字符串，返回地理坐标的多边形列表"""
    try:
        model_scope = json.loads(model_scope_str)
        if not model_scope:
            return None
        polygons = []
        for scope_group in model_scope:
            for scope in scope_group:  # 处理嵌套结构
                coords = [(x, y) for x, y in scope]
                polygons.append(Polygon(coords))
        return polygons
    except json.JSONDecodeError as e:
        print(f"Error decoding model scope: {e}")
        return None

def create_scope_mask(polygons, transform, img_height, img_width):
    """根据模型作用范围创建二值掩码，1表示作用区域，0表示非作用区域"""
    mask = np.zeros((img_height, img_width), dtype=np.uint8)
    if polygons is None:
        return np.ones((img_height, img_width), dtype=np.uint8)  # 如果没有范围，全部为1
    shapes = [(poly, 1) for poly in polygons]
    mask = rasterio.features.rasterize(
        shapes=shapes,
        out_shape=(img_height, img_width),
        fill=0,
        transform=transform,
        all_touched=True,
        dtype=np.uint8
    )
    # 扩展作用范围到图像边界
    from scipy.ndimage import binary_dilation
    mask = binary_dilation(mask, iterations=5)  # 扩展5像素
    return mask

def apply_scope_to_image_and_mask(image, label_mask, scope_mask):
    """根据作用范围裁剪图像和掩码，只保留作用区域内的像素"""
    if scope_mask is None or np.all(scope_mask == 1):
        return image, label_mask
    
    # 对图像应用掩码
    masked_image = image.copy()
    for c in range(image.shape[0]):  # 对每个通道
        masked_image[c] = masked_image[c] * scope_mask
    
    # 如果 label_mask 为 None，直接返回 None
    if label_mask is None:
        return masked_image, None
    
    # 对标签掩码应用掩码，非作用区域设置为背景
    masked_label = label_mask.copy()
    background_index = np.max(label_mask)  # 假设背景是最大值
    masked_label[scope_mask == 0] = background_index
    
    return masked_image, masked_label

# 掩膜处理
def identify_holes_and_split(mask, transform, class_index_to_type_id, background_class_index):
    """
    从掩码中识别多边形（包括外环和内环），将内环作为孔洞保留在多边形中。
    
    参数:
        mask: 输入的掩码图像 (numpy 数组)
        transform: 坐标变换函数
        class_index_to_type_id: 类索引到类型 ID 的映射字典
        background_class_index: 背景类索引
    
    返回:
        字典，键为类型 ID，值为对应类型的多边形列表
    """
    polygons = {}
    for class_index in np.unique(mask):
        if class_index == background_class_index:
            continue
        type_id = class_index_to_type_id.get(class_index)
        if type_id is None:
            continue
        # 创建当前类的掩码
        class_mask = (mask == class_index).astype(np.uint8)
        # 查找轮廓和层级关系
        contours, hierarchy = cv2.findContours(class_mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
        if hierarchy is None or len(contours) == 0:
            continue
        class_polygons = []
        i = 0
        while i < len(contours):
            if len(contours[i]) < 3:
                i += 1
                continue
            # 如果是外环（无父轮廓）
            if hierarchy[0][i][3] == -1:
                # 获取外环坐标并应用变换
                exterior_coords = [(transform * (point[0][0], point[0][1])) for point in contours[i]]
                exterior_coords = [(x, y) for x, y in exterior_coords]
                
                # 查找所有内环（孔洞）
                interior_rings = []
                hole_idx = hierarchy[0][i][2]
                while hole_idx != -1:
                    if len(contours[hole_idx]) >= 3:
                        interior_coords = [(transform * (point[0][0], point[0][1])) for point in contours[hole_idx]]
                        interior_coords = [(x, y) for x, y in interior_coords]
                        interior_rings.append(interior_coords)
                    hole_idx = hierarchy[0][hole_idx][0]
                
                try:
                    # 创建带有孔洞的多边形
                    if interior_rings:
                        # 创建带有内环的多边形
                        polygon = Polygon(exterior_coords, holes=interior_rings)
                    else:
                        # 创建无孔洞的多边形
                        polygon = Polygon(exterior_coords)
                    
                    class_polygons.append(polygon)
                except Exception as e:
                    print(f"创建多边形时出错: {e}")
            i += 1
        if class_polygons:
            polygons[type_id] = class_polygons
    return polygons


@jit(nopython=True)
def remove_small_objects(labeled_mask, min_object_size):
    """
    使用Numba从标记的掩码中移除小于min_object_size的对象。

    参数：
        labeled_mask: 整数标签的二维numpy数组
        min_object_size: 对象的最小面积阈值

    返回值：
        labeled_mask: 修改后的掩码，移除了小对象
    """
    # 找到最大的标签
    max_label = 0
    for i in range(labeled_mask.shape[0]):
        for j in range(labeled_mask.shape[1]):
            if labeled_mask[i, j] > max_label:
                max_label = labeled_mask[i, j]

    # 统计每个标签的像素数量
    label_counts = np.zeros(max_label + 1, dtype=np.int32)
    for i in range(labeled_mask.shape[0]):
        for j in range(labeled_mask.shape[1]):
            label = labeled_mask[i, j]
            if label > 0:
                label_counts[label] += 1

    # 移除小对象
    for i in range(labeled_mask.shape[0]):
        for j in range(labeled_mask.shape[1]):
            label = labeled_mask[i, j]
            if label > 0 and label_counts[label] < min_object_size:
                labeled_mask[i, j] = 0

    return labeled_mask

def post_process_mask(mask, min_object_size=10, hole_size_threshold=20, boundary_smoothing=3):
    """
    通过先平滑边界，再移除小对象和填充小孔来后处理输入掩码。

    参数：
        mask: 输入的多类别掩码，numpy数组，uint8类型
        min_object_size: 最小对象面积阈值；小于此值的对象将被移除
        hole_size_threshold: 小孔面积阈值；小于此值的孔将被填充
        boundary_smoothing: 形态学平滑的内核大小

    返回值：
        processed_mask: 处理后的掩码，numpy数组，uint8类型
    """
    # 复制原始掩码并初始化输出掩码
    # original_mask = mask.copy().astype(np.uint8)
    unique_classes = np.unique(mask)
    processed_mask = np.zeros_like(mask, dtype=np.uint8)

    # 步骤 1: 处理每个类别，先平滑边界，再移除小对象和填充孔
    for class_idx in unique_classes:
        if class_idx == 0:  # 跳过背景
            continue

        # 提取当前类别的二值掩码
        class_mask = (mask == class_idx).astype(np.uint8)

        # 步骤 1: 形态学平滑边界
        kernel = np.ones((boundary_smoothing, boundary_smoothing), np.uint8)
        smoothed_mask = cv2.morphologyEx(class_mask, cv2.MORPH_CLOSE, kernel)
        smoothed_mask = cv2.morphologyEx(smoothed_mask, cv2.MORPH_OPEN, kernel)

        # 步骤 2: 移除小对象
        labeled_mask, num_labels = label(smoothed_mask, return_num=True)
        labeled_mask = remove_small_objects(labeled_mask, min_object_size)
        cleaned_mask = (labeled_mask > 0).astype(np.uint8)

        # 步骤 3: 填充小孔
        filled_mask = cleaned_mask.copy()
        contours, hierarchy = cv2.findContours(cleaned_mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
        if hierarchy is not None:
            for i, contour in enumerate(contours):
                if hierarchy[0][i][3] != -1:  # 如果有父轮廓，说明是内部孔洞
                    area = cv2.contourArea(contour)
                    if 0 < area < hole_size_threshold:
                        cv2.drawContours(filled_mask, [contour], 0, 1, -1)

        # 将处理后的掩码添加到总掩码
        processed_mask[filled_mask == 1] = class_idx
    # visualize_mask_comparison(original_mask, processed_mask)
    return processed_mask


def create_original_label_mask(labels_data, transform, img_height, img_width, background_class_index, type_id_to_class_index):
    """根据标签数据创建标签掩膜，使用地理坐标，背景样本（type_id=0）最后覆盖"""
    mask = np.full((img_height, img_width), background_class_index, dtype=np.uint8)
    
    # 分离背景样本和普通样本
    background_samples = []
    normal_samples = []
    
    for _, geom_str, type_id, *_ in labels_data:
        if type_id == 0:  # 背景样本
            background_samples.append((geom_str, type_id))
        else:  # 普通样本
            normal_samples.append((geom_str, type_id))
    
    # 先处理普通样本
    for geom_str, type_id in normal_samples:
        try:
            coords_str_list = geom_str.split(',')
            coords_list = []
            for i in range(0, len(coords_str_list), 2):
                x = float(coords_str_list[i].strip())
                y = float(coords_str_list[i+1].strip())
                coords_list.append((x, y))
            polygon = Polygon(coords_list)
            class_index = type_id_to_class_index.get(type_id)
            if class_index is not None:
                temp_mask = rasterio.features.rasterize(
                    shapes=[(polygon, int(class_index))],
                    out_shape=(img_height, img_width),
                    fill=background_class_index,
                    transform=transform,
                    all_touched=True,
                    dtype=np.uint8
                )
                # 覆盖逻辑：非背景区域用新值替换
                mask = np.where(temp_mask != background_class_index, temp_mask, mask)
            else:
                print(f"警告: type_id {type_id} 未在映射中找到，已跳过。")
        except (ValueError, IndexError) as e:
            print(f"处理几何字符串时出错: {e}, geom_str: {geom_str}")
            continue
        except ValueError as e:
            print(f"光栅化多边形时出错: {e}")
            continue
    
    # 最后处理背景样本，将这些区域重置为背景
    for geom_str, type_id in background_samples:
        try:
            coords_str_list = geom_str.split(',')
            coords_list = []
            for i in range(0, len(coords_str_list), 2):
                x = float(coords_str_list[i].strip())
                y = float(coords_str_list[i+1].strip())
                coords_list.append((x, y))
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
            print(f"背景样本已应用，消除了标错区域")
            
        except (ValueError, IndexError) as e:
            print(f"处理背景样本几何字符串时出错: {e}, geom_str: {geom_str}")
            continue
        except ValueError as e:
            print(f"光栅化背景样本时出错: {e}")
            continue
            
    return mask

# 可视化函数
def visualize_mask_comparison(original_mask, processed_mask):
    plt.figure(figsize=(15, 5))
    plt.subplot(131)
    plt.imshow(original_mask, cmap='tab20')
    plt.title("Raw Predicted Mask")
    plt.axis('off')
    plt.subplot(132)
    plt.imshow(processed_mask, cmap='tab20')
    plt.title("Post-Processed Mask")
    plt.axis('off')
    difference = np.zeros_like(original_mask)
    difference[(original_mask != processed_mask) & (original_mask > 0)] = 1
    difference[(original_mask != processed_mask) & (processed_mask > 0) & (original_mask == 0)] = 2
    plt.subplot(133)
    plt.imshow(difference, cmap='coolwarm')
    plt.title("Changes (Red: Removed, Blue: Added)")
    plt.axis('off')
    plt.tight_layout()
    plt.savefig("mask_processing_comparison.png")
    plt.close()
    plt.figure(figsize=(8, 8))
    plt.imshow(original_mask, cmap='tab20')
    plt.title("Raw Predicted Mask")
    plt.axis('off')
    plt.savefig("raw_predicted_mask.png")
    plt.close()
    plt.figure(figsize=(8, 8))
    plt.imshow(processed_mask, cmap='tab20')
    plt.title("Post-Processed Mask")
    plt.axis('off')
    plt.savefig("post_processed_mask.png")
    plt.close()
    print("掩膜处理结果比较已保存到 mask_processing_comparison.png")
    print("原始掩膜已保存到 raw_predicted_mask.png，后处理掩膜已保存到 post_processed_mask.png")

def visualize_results(image_np, label_mask_np, predicted_mask_np, num_classes, output_path_prefix="segmentation_result"):
    class_colors = plt.cm.get_cmap('tab20', num_classes)
    colored_label_mask = class_colors(label_mask_np / num_classes)[:, :, :3]
    colored_predicted_mask = class_colors(predicted_mask_np / num_classes)[:, :, :3]
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    axes[0].imshow(np.transpose(image_np[:3, :, :], (1, 2, 0)))
    axes[0].set_title("Original Image (RGB)")
    axes[1].imshow(colored_label_mask)
    axes[1].set_title("Ground Truth Mask")
    axes[2].imshow(colored_predicted_mask)
    axes[2].set_title("Predicted Mask")
    plt.tight_layout()
    plt.savefig(f"{output_path_prefix}_masks.png")
    plt.close()
    fig, ax = plt.subplots(figsize=(8, 8))
    ax.imshow(np.transpose(image_np[:3, :, :], (1, 2, 0)))
    ax.imshow(colored_predicted_mask, alpha=0.5)
    ax.set_title("Segmentation Overlay")
    plt.tight_layout()
    plt.savefig(f"{output_path_prefix}_overlay.png")
    plt.close()
    print(f"可视化结果已保存到 {output_path_prefix}_*.png")

def visualize_original_mask(mask, num_classes, output_path="original_mask.png"):
    class_colors = plt.cm.get_cmap('tab20', num_classes)
    colored_mask = class_colors(mask / num_classes)[:, :, :3]
    plt.figure(figsize=(8, 8))
    plt.imshow(colored_mask)
    plt.title("Original Mask from Database")
    plt.axis('off')
    plt.savefig(output_path)
    plt.close()
    print(f"Original mask visualization saved to {output_path}")

# 数据准备
def prepare_data_for_sklearn(image, mask):
    X = image.transpose(1, 2, 0).reshape(-1, image.shape[0])
    y = mask.ravel()
    return X, y

def prepare_data_for_sklearn_with_windows(image_path, labels_data, type_id_to_class_index, background_class_index):
    """
    基于标签数据寻找训练窗口，为 XGBoost 准备训练数据
    
    参数:
        image_path: 图像路径
        labels_data: 标签数据
        type_id_to_class_index: 类型ID到类别索引的映射
        background_class_index: 背景类别索引
    
    返回:
        X: 特征矩阵 (n_samples, n_features)
        y: 标签向量 (n_samples,)
        window_transforms: 窗口变换信息列表
    """
    import rasterio
    import rasterio.windows
    import rasterio.features
    from shapely.geometry import Polygon, box
    from shapely.ops import unary_union
    
    # 获取图像全局信息
    with rasterio.open(image_path) as src:
        global_transform = src.transform
        global_width = src.width
        global_height = src.height
        count = src.count

    # 确定训练窗口
    windows = _determine_training_windows_for_sklearn(
        labels_data, type_id_to_class_index, global_transform, global_width, global_height
    )
    
    print(f"找到 {len(windows)} 个训练窗口用于 XGBoost 训练")
    
    # 收集所有窗口的数据
    all_X = []
    all_y = []
    window_transforms = []
    
    for i, window in enumerate(windows):
        print(f"处理训练窗口 {i+1}/{len(windows)}")
        
        # 加载窗口数据
        with rasterio.open(image_path) as src:
            image = src.read(window=window)
            window_transform = rasterio.windows.transform(window, src.transform)
        
        image = image.astype(np.float32) / 255.0
        
        # 创建窗口掩膜
        width = window.width
        height = window.height
        label_mask = np.full((height, width), background_class_index, dtype=np.int64)
        
        for _, geom_str, type_id, *_ in labels_data:
            if type_id not in type_id_to_class_index:
                continue
            class_index = type_id_to_class_index[type_id]
            try:
                coords_str_list = geom_str.split(',')
                coords_list = [(float(coords_str_list[i].strip()), float(coords_str_list[i+1].strip()))
                               for i in range(0, len(coords_str_list), 2)]
                polygon = Polygon(coords_list)
                mask_temp = rasterio.features.rasterize(
                    [(polygon, 1)],
                    out_shape=(height, width),
                    transform=window_transform,
                    fill=0,
                    all_touched=True,
                    dtype=np.uint8
                )
                label_mask[mask_temp == 1] = class_index
            except Exception as e:
                print(f"创建掩膜时出错: {e}, geom_str: {geom_str}")
        
        # 准备数据
        X_window = image.transpose(1, 2, 0).reshape(-1, image.shape[0])
        y_window = label_mask.ravel()
        
        all_X.append(X_window)
        all_y.append(y_window)
        window_transforms.append(window_transform)
    
    # 合并所有窗口的数据
    X = np.vstack(all_X)
    y = np.concatenate(all_y)
    
    print(f"XGBoost 训练数据准备完成: X.shape={X.shape}, y.shape={y.shape}")
    
    return X, y, window_transforms

def _determine_training_windows_for_sklearn(labels_data, type_id_to_class_index, global_transform, global_width, global_height):
    """为 sklearn 模型确定训练窗口"""
    import rasterio.windows
    from shapely.geometry import Polygon, box
    from shapely.ops import unary_union
    
    if not labels_data:
        print("没有标签数据，使用整个图像作为单个窗口。")
        return [rasterio.windows.Window(0, 0, global_width, global_height)]

    # 收集所有标注的地理坐标
    all_polygons = []
    for _, geom_str, type_id, *_ in labels_data:
        if type_id not in type_id_to_class_index:
            continue
        try:
            coords_str_list = geom_str.split(',')
            coords = [(float(coords_str_list[i].strip()), float(coords_str_list[i+1].strip()))
                      for i in range(0, len(coords_str_list), 2)]
            polygon = Polygon(coords)
            all_polygons.append(polygon)
        except Exception as e:
            print(f"解析几何字符串时出错: {e}, geom_str: {geom_str}")
            continue

    if not all_polygons:
        print("没有有效的标注多边形，使用整个图像作为单个窗口。")
        return [rasterio.windows.Window(0, 0, global_width, global_height)]

    # 生成每个多边形的边界框
    bounding_boxes = [box(*poly.bounds) for poly in all_polygons]

    # 迭代合并重叠的边界框，直到没有重叠
    while True:
        merged_boxes = []
        merged = False
        i = 0
        while i < len(bounding_boxes):
            current_box = bounding_boxes[i]
            overlapping = [current_box]
            j = i + 1
            while j < len(bounding_boxes):
                if current_box.intersects(bounding_boxes[j]):
                    overlapping.append(bounding_boxes[j])
                    bounding_boxes.pop(j)
                    merged = True
                else:
                    j += 1
            if len(overlapping) > 1:
                merged_poly = unary_union(overlapping)
                merged_boxes.append(box(*merged_poly.bounds))
            else:
                merged_boxes.append(current_box)
            bounding_boxes.pop(i)
        bounding_boxes = merged_boxes
        if not merged:
            break  # 没有新的合并，退出循环

    # 为每个合并后的边界框创建窗口
    windows = []
    padding = 50  # 像素边距
    for merged_box in bounding_boxes:
        minx, miny, maxx, maxy = merged_box.bounds
        window = rasterio.windows.from_bounds(minx, miny, maxx, maxy, global_transform)
        col_start = max(0, int(window.col_off) - padding)
        row_start = max(0, int(window.row_off) - padding)
        col_stop = min(global_width, int(window.col_off + window.width) + padding)
        row_stop = min(global_height, int(window.row_off + window.height) + padding)
        width = col_stop - col_start
        height = row_stop - row_start
        if width > 0 and height > 0:
            windows.append(rasterio.windows.Window(col_start, row_start, width, height))
        else:
            print(f"跳过无效窗口: width={width}, height={height}")

    if not windows:
        print("未找到有效窗口，使用整个图像作为单个窗口。")
        return [rasterio.windows.Window(0, 0, global_width, global_height)]

    return windows

def crop_image_by_scope(image_path, model_scope_str):
    if not model_scope_str:
        return image_path, None  # 如果没有范围，返回原始影像

    model_scope_polygons = parse_model_scope(model_scope_str)
    if not model_scope_polygons:
        return image_path, None  # 如果解析失败或为空，返回原始影像

    with rasterio.open(image_path) as src:
        out_image, out_transform = mask(src, model_scope_polygons, crop=True)
        out_meta = src.meta.copy()
        out_meta.update({
            "driver": "GTiff",
            "height": out_image.shape[1],
            "width": out_image.shape[2],
            "transform": out_transform
        })

        cropped_image_path = image_path.replace('.tif', '_cropped.tif')
        with rasterio.open(cropped_image_path, "w", **out_meta) as dest:
            dest.write(out_image)

    return cropped_image_path, out_transform

def filter_labels_by_scope(labels_data, model_scope_polygons):
    if not model_scope_polygons:
        return labels_data  # 如果没有范围，保留所有标注

    filtered_labels = []
    for label in labels_data:
        geom_str = label[1]  # 假设 geom_str 是坐标字符串
        coords_str_list = geom_str.split(',')
        coords_list = [(float(coords_str_list[i].strip()), float(coords_str_list[i+1].strip())) 
                       for i in range(0, len(coords_str_list), 2)]
        # 检查多边形的任意一点是否在模型作用范围内
        if any(any(Point(x, y).within(poly) for poly in model_scope_polygons) 
               for x, y in coords_list):
            filtered_labels.append(label)
    return filtered_labels

def parse_model_scope(model_scope_str):
    """解析 model_scope_str 为 Shapely 多边形列表"""
    try:
        model_scope = json.loads(model_scope_str)
        if not model_scope:
            return None
        polygons = []
        for scope_group in model_scope:
            for scope in scope_group:  # 处理嵌套结构
                coords = [(x, y) for x, y in scope]
                polygons.append(Polygon(coords))
        return polygons
    except json.JSONDecodeError as e:
        print(f"Error decoding model scope: {e}")
        return None

def crop_image_by_scope(image_path, model_scope_str):
    """根据模型范围裁剪影像"""
    if model_scope_str == []:
        with rasterio.open(image_path) as src:
            original_transform = src.transform 
        return image_path, original_transform  # 如果没有范围，返回原始影像

    model_scope_polygons = parse_model_scope(model_scope_str)
    if not model_scope_polygons:
        with rasterio.open(image_path) as src:
            original_transform = src.transform 
        return image_path, original_transform  # 如果解析失败或为空，返回原始影像

    with rasterio.open(image_path) as src:
        out_image, out_transform = rasterio.mask.mask(src, model_scope_polygons, crop=True)
        out_meta = src.meta.copy()
        out_meta.update({
            "driver": "GTiff",
            "height": out_image.shape[1],
            "width": out_image.shape[2],
            "transform": out_transform
        })

        cropped_image_path = image_path.replace('.tif', '_cropped.tif')
        with rasterio.open(cropped_image_path, "w", **out_meta) as dest:
            dest.write(out_image)

    return cropped_image_path, out_transform
