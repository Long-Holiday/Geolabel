import rasterio
import rasterio.windows
import rasterio.features
from shapely.geometry import Polygon, box
from shapely.ops import unary_union
import torch
from torch.utils.data import Dataset
import numpy as np
import albumentations as A
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from typing import List, Dict, Any, Tuple # 增加类型提示

class RemoteSensingSegmentationDataset(Dataset):
    def __init__(self, image_path, labels_data, num_classes, type_id_to_class_index,
                 background_class_index, apply_transforms=False, vis_output_path="./visualization.png",
                 target_size=(512, 512)):
        self.image_path = image_path
        self.labels_data = labels_data or []
        self.num_classes = num_classes
        self.type_id_to_class_index = type_id_to_class_index
        self.background_class_index = background_class_index
        self.apply_transforms = apply_transforms
        self.vis_output_path = vis_output_path
        self.target_size = target_size

        # 获取图像全局信息
        with rasterio.open(self.image_path) as src:
            self.global_transform = src.transform
            self.crs = src.crs
            self.global_width = src.width
            self.global_height = src.height
            self.count = src.count

        # 确定多个训练窗口
        self.windows = self._determine_training_windows()

        # 为每个窗口加载图像和掩膜
        self.images = []
        self.label_masks = []
        self.window_transforms = []
        for window in self.windows:
            image, label_mask, window_transform = self._load_window_data(window)
            self.images.append(image)
            self.label_masks.append(label_mask)
            self.window_transforms.append(window_transform)

        # 可视化窗口、样本和影像的位置关系
        self._visualize_windows_and_samples()

        # 设置数据增强
        if self.apply_transforms:
            self.transforms = A.Compose([
                A.Resize(height=target_size[0], width=target_size[1], always_apply=True),
                A.HorizontalFlip(p=0.5),
                A.VerticalFlip(p=0.5),
                A.RandomRotate90(p=0.5),
                A.ShiftScaleRotate(shift_limit=0.0625, scale_limit=0.1, rotate_limit=45, p=0.5),
                A.RandomBrightnessContrast(p=0.5),
            ])
        else:
            self.transforms = A.Compose([
                A.Resize(height=target_size[0], width=target_size[1], always_apply=True),
            ])

    def _determine_training_windows(self):
        """根据标注样本确定多个训练窗口，返回 Window 对象的列表"""
        if not self.labels_data:
            print("没有标签数据，使用整个图像作为单个窗口。")
            return [rasterio.windows.Window(0, 0, self.global_width, self.global_height)]

        # 收集所有标注的地理坐标
        all_polygons = []
        for _, geom_str, type_id, *_ in self.labels_data:
            if type_id not in self.type_id_to_class_index:
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
            return [rasterio.windows.Window(0, 0, self.global_width, self.global_height)]

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
            window = rasterio.windows.from_bounds(minx, miny, maxx, maxy, self.global_transform)
            col_start = max(0, int(window.col_off) - padding)
            row_start = max(0, int(window.row_off) - padding)
            col_stop = min(self.global_width, int(window.col_off + window.width) + padding)
            row_stop = min(self.global_height, int(window.row_off + window.height) + padding)
            width = col_stop - col_start
            height = row_stop - row_start
            if width > 0 and height > 0:
                windows.append(rasterio.windows.Window(col_start, row_start, width, height))
            else:
                print(f"跳过无效窗口: width={width}, height={height}")

        if not windows:
            print("未找到有效窗口，使用整个图像作为单个窗口。")
            return [rasterio.windows.Window(0, 0, self.global_width, self.global_height)]

        return windows

    def _load_window_data(self, window):
        """加载指定窗口的图像、掩膜和变换矩阵"""
        with rasterio.open(self.image_path) as src:
            image = src.read(window=window)
            window_transform = rasterio.windows.transform(window, src.transform)
        image = image.astype(np.float32) / 255.0

        width = window.width
        height = window.height
        label_mask = np.full((height, width), self.background_class_index, dtype=np.int64)
        for _, geom_str, type_id, *_ in self.labels_data:
            if type_id not in self.type_id_to_class_index:
                continue
            class_index = self.type_id_to_class_index[type_id]
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
        return image, label_mask, window_transform

    def _visualize_windows_and_samples(self):
        """可视化影像、窗口和样本的位置关系，并保存结果"""
        with rasterio.open(self.image_path) as src:
            scale_factor = 0.1
            window = rasterio.windows.Window(0, 0, self.global_width, self.global_height)
            image = src.read(
                out_shape=(
                    src.count,
                    int(self.global_height * scale_factor),
                    int(self.global_width * scale_factor)
                ),
                resampling=rasterio.enums.Resampling.bilinear
            )
            transform = src.transform * src.transform.scale(
                (self.global_width / image.shape[2]),
                (self.global_height / image.shape[1])
            )

        fig, ax = plt.subplots(figsize=(12, 12))
        if image.shape[0] >= 3:
            rgb_image = image[:3].transpose(1, 2, 0)
        else:
            rgb_image = np.stack([image[0]] * 3, axis=2)
        ax.imshow(rgb_image)

        for i, window in enumerate(self.windows):
            col_start = window.col_off * scale_factor
            row_start = window.row_off * scale_factor
            width = window.width * scale_factor
            height = window.height * scale_factor
            rect = patches.Rectangle(
                (col_start, row_start), width, height,
                linewidth=2, edgecolor='yellow', facecolor='none', label=f'Window {i+1}' if i == 0 else None
            )
            ax.add_patch(rect)

        for _, geom_str, type_id, *_ in self.labels_data:
            if type_id not in self.type_id_to_class_index:
                continue
            try:
                coords_str_list = geom_str.split(',')
                coords = [(float(coords_str_list[i].strip()), float(coords_str_list[i+1].strip()))
                          for i in range(0, len(coords_str_list), 2)]
                polygon = Polygon(coords)
                pixel_coords = [
                    rasterio.transform.rowcol(transform, x, y)
                    for x, y in polygon.exterior.coords
                ]
                pixel_coords = [(col * scale_factor, row * scale_factor) for row, col in pixel_coords]
                poly_patch = patches.Polygon(
                    pixel_coords, closed=True, edgecolor='red', facecolor='none', linewidth=1.5,
                    label='Sample' if _ == self.labels_data[0][0] else None
                )
                ax.add_patch(poly_patch)
            except Exception as e:
                print(f"可视化多边形时出错: {e}, geom_str: {geom_str}")

        ax.set_title("Image with Windows and Samples")
        ax.legend()
        ax.set_xlabel("Column (pixels)")
        ax.set_ylabel("Row (pixels)")
        plt.savefig(self.vis_output_path, dpi=300, bbox_inches='tight')
        plt.close(fig)
        print(f"可视化结果已保存至: {self.vis_output_path}")

    def __len__(self):
        return len(self.windows)

    def __getitem__(self, idx):
        image = self.images[idx]
        label_mask = self.label_masks[idx]
        window_transform = self.window_transforms[idx]

        image_tensor = torch.from_numpy(image).float()
        label_mask_tensor = torch.from_numpy(label_mask).long()

        image_np = image_tensor.permute(1, 2, 0).numpy()
        label_mask_np = label_mask_tensor.numpy()
        transformed = self.transforms(image=image_np, mask=label_mask_np)
        image_tensor = torch.from_numpy(transformed['image']).permute(2, 0, 1).float()
        label_mask_tensor = torch.from_numpy(transformed['mask']).long()

        return image_tensor, label_mask_tensor, window_transform
    
class MultRemoteSensingSegmentationDataset(Dataset):
    def __init__(self,
                 image_paths: List[str],
                 all_labels_data: List[List[Tuple]], # 每个内部List对应一个影像的标签
                 num_classes: int,
                 type_id_to_class_index: Dict[Any, int],
                 background_class_index: int,
                 apply_transforms: bool = False,
                 target_size: Tuple[int, int] = (512, 512)):
        self.image_paths = image_paths
        self.all_labels_data = all_labels_data
        self.num_classes = num_classes
        self.type_id_to_class_index = type_id_to_class_index
        self.background_class_index = background_class_index
        self.apply_transforms = apply_transforms
        self.target_size = target_size

        self.images = []
        self.label_masks = []
        self.source_transforms = [] # 存储每个影像的原始地理变换信息

        for i, image_path in enumerate(self.image_paths):
            labels_data_for_image = self.all_labels_data[i]
            image, label_mask, src_transform = self._load_full_image_data(image_path, labels_data_for_image)
            self.images.append(image)
            self.label_masks.append(label_mask)
            self.source_transforms.append(src_transform)

        # 设置数据增强
        if self.apply_transforms:
            self.transforms = A.Compose([
                A.Resize(height=target_size[0], width=target_size[1], always_apply=True),
                A.HorizontalFlip(p=0.5),
                A.VerticalFlip(p=0.5),
                A.RandomRotate90(p=0.5),
                A.ShiftScaleRotate(shift_limit=0.0625, scale_limit=0.1, rotate_limit=45, p=0.5),
                A.RandomBrightnessContrast(p=0.5),
            ])
        else:
            self.transforms = A.Compose([
                A.Resize(height=target_size[0], width=target_size[1], always_apply=True),
            ])

    def _load_full_image_data(self, image_path: str, labels_data_for_image: List[Tuple]):
        """加载单张完整影像及其对应的完整掩膜"""
        with rasterio.open(image_path) as src:
            image = src.read() # 读取所有波段
            src_transform = src.transform
            width = src.width
            height = src.height

        image = image.astype(np.float32) / 255.0 # 归一化

        label_mask = np.full((height, width), self.background_class_index, dtype=np.int64)

        # 按标签ID升序排列，确保小ID的图斑先绘制，大ID的图斑后绘制（如果发生重叠，后者会覆盖前者）
        # 通常，数据库获取的标签数据的顺序可能没有特定业务含义，如果需要特定绘制顺序，需要明确
        # 这里我们假设labels_data_for_image中的顺序就是期望的绘制顺序，或者对于分割任务，重叠区域的类别由最后绘制的图斑决定
        
        # shapes_for_rasterize = [] # 用于存储 (geometry, value) 对
        for _, geom_str, type_id, *_ in labels_data_for_image:
            if type_id not in self.type_id_to_class_index:
                # print(f"警告: type_id {type_id} 在 image {image_path} 中未找到映射，跳过。")
                continue
            class_index = self.type_id_to_class_index[type_id]
            try:
                coords_str_list = geom_str.split(',')
                coords_list = [(float(coords_str_list[i].strip()), float(coords_str_list[i+1].strip()))
                               for i in range(0, len(coords_str_list), 2)]
                polygon = Polygon(coords_list)

                # shapes_for_rasterize.append({'geometry': mapping(polygon), 'value': class_index})

                # 直接栅格化每个多边形，后绘制的会覆盖先绘制的
                mask_temp = rasterio.features.rasterize(
                    [(polygon, class_index)], # 使用 class_index 作为 burn_value
                    out_shape=(height, width),
                    transform=src_transform,
                    fill=self.background_class_index, # 未被多边形覆盖的区域保持背景值
                    all_touched=True, # 确保接触到的像素都被栅格化
                    dtype=np.int64 # 与 label_mask 类型一致
                )
                # 将当前多边形的栅格化结果合并到主掩膜中
                # 只有当mask_temp中不是背景值时，才更新label_mask
                label_mask[mask_temp != self.background_class_index] = mask_temp[mask_temp != self.background_class_index]

            except Exception as e:
                print(f"为影像 {image_path} 创建掩膜时出错: {e}, geom_str: {geom_str}")
                continue
        
        # # 如果希望一次性栅格化所有图斑，并让高优先级的图斑覆盖低优先级的（假设 type_id 越大优先级越高）
        # # 需要先对 shapes_for_rasterize 按照 class_index 排序
        # if shapes_for_rasterize:
        #     # 假设 class_index 越大，优先级越高，所以后绘制
        #     shapes_for_rasterize.sort(key=lambda item: item['value'])
        #     geometries = [(item['geometry'], item['value']) for item in shapes_for_rasterize]
        #     label_mask = rasterio.features.rasterize(
        #         geometries,
        #         out_shape=(height, width),
        #         transform=src_transform,
        #         fill=self.background_class_index,
        #         all_touched=True,
        #         dtype=np.int64
        #     )

        return image, label_mask, src_transform

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):
        image = self.images[idx]
        label_mask = self.label_masks[idx]
        # window_transform (source_transform) 可以在训练后处理或评估时使用，这里暂不返回
        # source_transform = self.source_transforms[idx]

        # Albumentations期望 HWC 格式
        image_np = image.transpose(1, 2, 0) # C, H, W -> H, W, C
        label_mask_np = label_mask # H, W

        transformed = self.transforms(image=image_np, mask=label_mask_np)

        image_tensor = torch.from_numpy(transformed['image']).permute(2, 0, 1).float() # H, W, C -> C, H, W
        label_mask_tensor = torch.from_numpy(transformed['mask']).long() # H, W

        # 返回 image_tensor, label_mask_tensor, 和原始变换（如果需要）
        # return image_tensor, label_mask_tensor, source_transform
        return image_tensor, label_mask_tensor, self.source_transforms[idx] # 返回原始变换信息