import os
from typing import Any, Dict, List, Tuple
import rasterio
from rasterio.features import shapes
from shapely.geometry import Polygon, mapping
from pyproj import Transformer
import numpy as np
import cv2
from PIL import Image
import shutil
from shapely.geometry import MultiPolygon
from utils import filter_labels_by_scope, parse_model_scope

#目标检测 yolo 模型设置
# -------------------- 图像转换函数 --------------------
def convert_tif_to_jpeg(tif_path, output_jpeg_path):
    """将 .tif 文件转换为 RGB JPEG 文件，仅保留前三个波段"""
    try:
        with rasterio.open(tif_path) as src:
            if src.count < 3:
                raise ValueError(f"图像 {tif_path} 的波段数少于 3，无法转换为 RGB JPEG")
            
            img = src.read([1, 2, 3])
            img = np.transpose(img, (1, 2, 0))

            if img.dtype != np.uint8:
                img = img.astype(np.float32)
                img_min, img_max = img.min(), img.max()
                if img_max > img_min:
                    img = (img - img_min) / (img_max - img_min) * 255
                img = img.astype(np.uint8)

            image = Image.fromarray(img, mode='RGB')
            image.save(output_jpeg_path, format='JPEG', quality=95)
            print(f"成功将 {tif_path} 转换为 {output_jpeg_path}")
            return True
    except Exception as e:
        print(f"转换 {tif_path} 到 JPEG 时出错: {e}")
        return False

# -------------------- 可视化函数 --------------------
def draw_boxes_on_image(image_path, boxes, labels, output_path, color=(0, 255, 0)):
    """在图像上绘制 bounding boxes"""
    img = cv2.imread(image_path)
    if img is None:
        print(f"无法加载图像 {image_path}")
        return

    for box, label in zip(boxes, labels):
        if len(box) == 4:  # Regular bounding box
            x1, y1, x2, y2 = box
            x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
            cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
        elif len(box) == 8:  # OBB (x1, y1, x2, y2, x3, y3, x4, y4)
            points = np.array(box, dtype=np.int32).reshape((-1, 1, 2))
            cv2.polylines(img, [points], isClosed=True, color=color, thickness=2)
        cv2.putText(img, str(label), (int(box[0]), int(box[1]) - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    cv2.imwrite(output_path, img)
    print(f"已保存可视化图像到 {output_path}")

# -------------------- YOLO 数据集生成函数 --------------------
def create_yolo_dataset(labels_data, image_path, output_dir, model_scope_str=None):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    images_dir = os.path.join(output_dir, "images")
    labels_dir = os.path.join(output_dir, "labels")
    os.makedirs(images_dir, exist_ok=True)
    os.makedirs(labels_dir, exist_ok=True)

    # 解析模型作用范围
    # model_scope_polygons = parse_model_scope(model_scope_str) if model_scope_str else None
    # 过滤标注
    # filtered_labels = filter_labels_by_scope(labels_data, model_scope_polygons)

    image_name = os.path.basename(image_path)
    jpeg_name = image_name.replace(".tif", ".jpg")
    jpeg_path = os.path.join(images_dir, jpeg_name)
    if not convert_tif_to_jpeg(image_path, jpeg_path):
        raise ValueError(f"无法将 {image_path} 转换为 JPEG，程序退出。")

    with Image.open(jpeg_path) as img:
        img_width, img_height = img.size

    with rasterio.open(image_path) as src:
        inverse_transform = ~src.transform
        tif_width, tif_height = src.width, src.height
        tif_crs = src.crs
        # if tif_crs != CRS.from_epsg(3857):
        #     print(f"警告: 图像坐标系为 {tif_crs}，不是 EPSG:3857，可能导致坐标转换错误！")

    width_ratio = img_width / tif_width
    height_ratio = img_height / tif_height

    label_file_path = os.path.join(labels_dir, jpeg_name.replace(".jpg", ".txt"))
    type_id_to_class_id = {}
    class_id_counter = 0
    original_boxes = []
    original_labels = []

    with open(label_file_path, "w") as f:
        for _, geom_str, type_id, *_ in labels_data:
            try:
                if type_id not in type_id_to_class_id:
                    type_id_to_class_id[type_id] = class_id_counter
                    class_id_counter += 1
                class_id = type_id_to_class_id[type_id]

                coords_str_list = geom_str.split(',')
                coords_list = [(float(coords_str_list[i].strip()), float(coords_str_list[i+1].strip())) 
                               for i in range(0, len(coords_str_list), 2)]
                polygon = Polygon(coords_list)
                coords = list(polygon.exterior.coords)[:-1]  # 移除闭合点

                pixel_coords = [inverse_transform * (x, y) for x, y in coords]
                pixel_coords = [(x * width_ratio, y * height_ratio) for x, y in pixel_coords]

                if len(pixel_coords) < 4:
                    print(f"警告: 多边形点数少于4，跳过: {geom_str}")
                    continue

                norm_coords = [(x / img_width, y / img_height) for x, y in pixel_coords[:4]]
                norm_coords = [max(0, min(1, coord)) for sublist in norm_coords for coord in sublist]

                f.write(f"{class_id} {' '.join(map(str, norm_coords))}\n")

                obb_box = [coord for point in pixel_coords[:4] for coord in point]
                original_boxes.append(obb_box)
                original_labels.append(f"Class {class_id}")
            except Exception as e:
                print(f"处理几何字符串时出错: {e}, geom_str: {geom_str}")
                continue

    return images_dir, labels_dir, type_id_to_class_id, jpeg_path, original_boxes, original_labels

def create_yolo_data_yaml(output_dir, images_dir, labels_dir, type_ids):
    """生成 YOLO 数据集的 data.yaml 文件"""
    data_yaml_path = os.path.join(output_dir, "data.yaml")
    with open(data_yaml_path, "w") as f:
        f.write("train: {}\n".format(os.path.join(images_dir, "train")))
        f.write("val: {}\n".format(os.path.join(images_dir, "val")))
        f.write("nc: {}\n".format(len(type_ids)))
        f.write("names: {}\n".format([str(i) for i in range(len(type_ids))]))
    return data_yaml_path

# -------------------- 处理 YOLO 检测结果 --------------------
def process_yolo_results(results, transform, task_id, user_id, status, conn, class_id_to_type_id, output_image_path,IMAGE_PATH):
    """处理 YOLO OBB 检测结果，将检测框转换为地理坐标并插入数据库"""
    if not results or len(results) == 0:
        print("YOLO 检测未返回有效结果！")
        return {}, [], []

    detection_polygons = {}
    detection_boxes = []
    detection_labels = []

    for result in results:
        if result.obb is None or len(result.obb.xyxyxyxy) == 0:
            print("无 OBB 检测结果！")
            continue

        boxes = result.obb.xyxyxyxy.cpu().numpy()  # OBB coordinates (x1, y1, x2, y2, x3, y3, x4, y4)
        class_ids = result.obb.cls.cpu().numpy()
        confidences = result.obb.conf.cpu().numpy()

        print(f"检测到 {len(boxes)} 个 OBB 目标框:")
        print(f"所有检测框置信度: {confidences}")
        for i, (box, class_id, conf) in enumerate(zip(boxes, class_ids, confidences)):
            print(f"目标 {i+1}: class_id={int(class_id)}, conf={conf:.3f}, box={box}")

            # 修改类别映射处理方式，兼容新的映射方法
            type_id = class_id_to_type_id.get(int(class_id))
            if type_id is None:
                print(f"警告: class_id {class_id} 未找到对应的 type_id，跳过。")
                continue

            with Image.open(result.path) as img:
                img_width, img_height = img.size
            with rasterio.open(IMAGE_PATH) as src:
                tif_width, tif_height = src.width, src.height
            width_ratio = tif_width / img_width
            height_ratio = tif_height / img_height

            # Convert to tif coordinates
            tif_coords = [(x * width_ratio, y * height_ratio) for x, y in box.reshape(4, 2)]
            geo_corners = [(transform * (x, y)) for x, y in tif_coords]
            geo_corners = [(float(x), float(y)) for x, y in geo_corners]

            if type_id not in detection_polygons:
                detection_polygons[type_id] = []
            polygon = Polygon(geo_corners)
            detection_polygons[type_id].append(polygon)

            detection_boxes.append(box.flatten().tolist())  # Flatten to [x1, y1, x2, y2, x3, y3, x4, y4]
            detection_labels.append(f"Class {class_id} (conf: {conf:.2f})")

    return detection_polygons, detection_boxes, detection_labels

# 处理重叠标注


# -------------------- 清理函数 --------------------
def cleanup_training_files(output_dir):
    """删除生成的训练文件目录"""
    try:
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir)
            print(f"已删除训练目录: {output_dir}")
        else:
            print(f"训练目录 {output_dir} 不存在，无需删除。")
    except Exception as e:
        print(f"删除训练目录 {output_dir} 时出错: {e}")

def filter_original_labels_with_type(original_polygons_with_type, predicted_polygons, distance_threshold=15):
    filtered = []
    all_predicted = [poly for polys in predicted_polygons.values() for poly in polys]
    predicted_multipoly = MultiPolygon(all_predicted) if all_predicted else MultiPolygon()
    for orig_poly, type_id in original_polygons_with_type:
        orig_centroid = orig_poly.centroid
        keep = True
        for pred_poly in predicted_multipoly.geoms:
            pred_centroid = pred_poly.centroid
            if orig_centroid.distance(pred_centroid) < distance_threshold:
                keep = False
                break
        if keep:
            filtered.append((orig_poly, type_id))
    return filtered

def filter_original_labels(original_polygons, predicted_polygons, distance_threshold=15):

    filtered_original = []
    # Flatten predicted_polygons into a list of Polygon objects and create MultiPolygon
    all_predicted = [poly for polys in predicted_polygons.values() for poly in polys]
    predicted_multipoly = MultiPolygon(all_predicted) if all_predicted else MultiPolygon()
    
    for orig_poly in original_polygons:
        orig_centroid = orig_poly.centroid
        keep = True
        # Iterate over individual Polygon objects in MultiPolygon using .geoms
        for pred_poly in predicted_multipoly.geoms:
            pred_centroid = pred_poly.centroid
            if orig_centroid.distance(pred_centroid) < distance_threshold:
                keep = False
                break
        if keep:
            filtered_original.append(orig_poly)
    return filtered_original

def create_multi_image_yolo_dataset(
    all_image_paths: List[str],
    all_labels_data: List[List[Tuple]], # 每个内部List对应一个影像的标签
    output_dir: str,
    type_id_to_class_id: Dict[Any, int] # 预先计算好的全局映射
):
    """
    为多张影像创建YOLO数据集。
    影像将被转换为JPG并放入 images/train 和 images/val。
    标签将被转换为TXT并放入 labels/train 和 labels/val。
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    images_base_dir = os.path.join(output_dir, "images")
    labels_base_dir = os.path.join(output_dir, "labels")
    
    # 为 train 和 val 创建子目录
    for split in ["train", "val"]:
        os.makedirs(os.path.join(images_base_dir, split), exist_ok=True)
        os.makedirs(os.path.join(labels_base_dir, split), exist_ok=True)

    all_original_boxes = []
    all_original_labels = []
    processed_image_paths = [] # 存储成功处理的jpeg路径，用于data.yaml

    for i, image_path in enumerate(all_image_paths):
        labels_data_for_image = all_labels_data[i]
        
        # 为每个原始TIF影像生成唯一的文件名基础
        # 例如，使用 "taskid_index_originalbasename"
        original_basename = os.path.splitext(os.path.basename(image_path))[0]
        # 假设 image_path 中包含了 taskid 或者可以从 all_labels_data[i] 的某个元素中提取
        # 这里为了简化，我们用索引和原始名组合
        unique_jpeg_name = f"image_{i}_{original_basename}.jpg"
        
        # 确定train/val的路径
        # 简单起见，所有影像都放入train和val，YOLO会自动处理
        # 更复杂的划分逻辑可以在这里实现
        for split in ["train", "val"]:
            current_jpeg_path = os.path.join(images_base_dir, split, unique_jpeg_name)
            current_label_path = os.path.join(labels_base_dir, split, unique_jpeg_name.replace(".jpg", ".txt"))

            # 仅当在 'train' split 且文件不存在时转换和写入标签，然后复制到 'val'
            if split == "train":
                if not convert_tif_to_jpeg(image_path, current_jpeg_path):
                    print(f"警告: 无法将 {image_path} 转换为 JPEG，跳过此影像。")
                    continue # 跳过这个影像的处理
                processed_image_paths.append(os.path.join(images_base_dir, "train", unique_jpeg_name)) # 添加到列表

                with Image.open(current_jpeg_path) as img:
                    img_width, img_height = img.size

                with rasterio.open(image_path) as src:
                    inverse_transform = ~src.transform
                    tif_width, tif_height = src.width, src.height
                
                width_ratio = img_width / tif_width
                height_ratio = img_height / tif_height

                with open(current_label_path, "w") as f_label:
                    for _, geom_str, type_id, *_ in labels_data_for_image:
                        try:
                            class_id = type_id_to_class_id.get(type_id)
                            if class_id is None:
                                # print(f"警告: type_id {type_id} 在影像 {image_path} 中未找到全局class_id映射，跳过。")
                                continue

                            coords_str_list = geom_str.split(',')
                            coords_list = [(float(coords_str_list[j].strip()), float(coords_str_list[j+1].strip()))
                                           for j in range(0, len(coords_str_list), 2)]
                            polygon = Polygon(coords_list)
                            coords = list(polygon.exterior.coords)[:-1]

                            pixel_coords = [inverse_transform * (x, y) for x, y in coords]
                            pixel_coords = [(x * width_ratio, y * height_ratio) for x, y in pixel_coords]

                            if len(pixel_coords) < 4:
                                # print(f"警告: 影像 {image_path} 中多边形点数少于4，跳过: {geom_str}")
                                continue
                            
                            # YOLO OBB format expects 4 points (x1,y1,x2,y2,x3,y3,x4,y4) normalized
                            norm_coords = []
                            for pc_idx in range(min(4, len(pixel_coords))): #确保取不超过4个点
                                norm_x = max(0, min(1, pixel_coords[pc_idx][0] / img_width))
                                norm_y = max(0, min(1, pixel_coords[pc_idx][1] / img_height))
                                norm_coords.extend([norm_x, norm_y])
                            
                            # 如果点数不足4个，YOLO OBB可能无法处理，但我们尽力了
                            # Ultralytics OBB 格式需要4个归一化点 (x1 y1 x2 y2 x3 y3 x4 y4)
                            # 如果原始多边形点少于4个，这里可能需要填充或跳过
                            if len(norm_coords) < 8 : # 不足4个点，补齐8个坐标
                                print(f"警告: 影像 {image_path} 中多边形转换后点数不足4个，将尝试补齐，可能导致YOLO错误。原始点数: {len(pixel_coords)}")
                                while len(norm_coords) < 8:
                                    norm_coords.extend(norm_coords[-2:]) # 重复最后一个点


                            f_label.write(f"{class_id} {' '.join(map(str, norm_coords))}\n")

                            # For potential visualization or debugging, store original pixel boxes
                            obb_box_pixel = [coord for point in pixel_coords[:4] for coord in point]
                            all_original_boxes.append(obb_box_pixel)
                            all_original_labels.append(f"Img{i}_Cls{class_id}")

                        except Exception as e:
                            print(f"处理影像 {image_path} 的几何字符串时出错: {e}, geom_str: {geom_str}")
                            continue
            elif split == "val": # 对于 val split，复制 train 的文件
                train_jpeg_path = os.path.join(images_base_dir, "train", unique_jpeg_name)
                train_label_path = os.path.join(labels_base_dir, "train", unique_jpeg_name.replace(".jpg", ".txt"))
                if os.path.exists(train_jpeg_path) and os.path.exists(train_label_path):
                    shutil.copy(train_jpeg_path, current_jpeg_path)
                    shutil.copy(train_label_path, current_label_path)
                else:
                    print(f"警告: 未找到影像 {unique_jpeg_name} 的train文件，无法复制到val。")


    # 返回 image_dir (train), label_dir (train), 以及用于调试的原始框信息
    # data.yaml 将使用 images_base_dir/train 和 images_base_dir/val
    return images_base_dir, labels_base_dir, all_original_boxes, all_original_labels


def create_Multi_yolo_data_yaml(output_dir, images_base_dir, labels_base_dir, class_names: List[str]):
    """生成 YOLO 数据集的 data.yaml 文件"""
    data_yaml_path = os.path.join(output_dir, "data.yaml")
    with open(data_yaml_path, "w") as f:
        f.write(f"train: {os.path.join(images_base_dir, 'train')}\n")
        f.write(f"val: {os.path.join(images_base_dir, 'val')}\n")
        f.write(f"nc: {len(class_names)}\n")
        f.write(f"names: {class_names}\n") # class_names 应该是 [ 'name0', 'name1', ...]
    return data_yaml_path
