# models/deeplabv3_plus.py
import torch
import torch.nn as nn
from torchvision.models.segmentation import (
    deeplabv3_resnet50,
    deeplabv3_resnet101,
    deeplabv3_mobilenet_v3_large # 导入 MobileNetV3-Large DeepLabV3+
)
from torchvision.models.segmentation import (
    DeepLabV3_ResNet50_Weights,
    DeepLabV3_ResNet101_Weights,
    DeepLabV3_MobileNet_V3_Large_Weights # 导入 MobileNetV3-Large DeepLabV3+ 权重
)
from typing import Optional, Union, Dict # Python 3.8+ Dict, Union

class DeepLabV3Plus(nn.Module):
    def __init__(self,
                 in_channels: int,
                 num_classes: int,
                 backbone_name: str = 'mobilenet_v3_large', # 'resnet50', 'resnet101', 'mobilenet_v3_large'
                 pretrained: bool = True,
                 aux_loss_enabled_for_wrapper: bool = False):
        """
        DeepLabV3+ Model
        Args:
            in_channels (int): 输入通道数 (例如 RGB 为 3, 灰度图为 1, 多光谱为 N).
            num_classes (int): 输出分割类别数.
            backbone_name (str): 主干网络名称 ('resnet50', 'resnet101', 'mobilenet_v3_large').
            pretrained (bool): 如果为 True, 使用在 COCO 上预训练的分割模型权重 (主干网络则使用 ImageNet 预训练权重).
                               注意: 预训练权重是针对3个输入通道的. 如果 in_channels 不是 3,
                               第一个卷积层将被修改, 其权重将随机初始化或进行适配.
            aux_loss_enabled_for_wrapper (bool): 如果为 True, 此包装器将尝试为 `num_classes` 修改辅助分类器,
                                                 并在训练期间返回其输出. 如果 `pretrained=True`,
                                                 底层的 torchvision 模型总是以其辅助头激活的方式实例化以正确加载权重.
                                                 此标志随后控制此包装器是否使用/修改该头.
        """
        super(DeepLabV3Plus, self).__init__()
        self.in_channels = in_channels
        self.num_classes = num_classes
        self.aux_loss_enabled_by_user = aux_loss_enabled_for_wrapper

        if pretrained:
            torchvision_model_init_with_aux = True
        else:
            torchvision_model_init_with_aux = self.aux_loss_enabled_by_user

        if backbone_name == 'resnet50':
            weights_arg: Optional[DeepLabV3_ResNet50_Weights] = DeepLabV3_ResNet50_Weights.DEFAULT if pretrained else None
            self.model = deeplabv3_resnet50(weights=weights_arg, aux_loss=torchvision_model_init_with_aux)
            first_conv_layer_path = "backbone.conv1"
        elif backbone_name == 'resnet101':
            weights_arg: Optional[DeepLabV3_ResNet101_Weights] = DeepLabV3_ResNet101_Weights.DEFAULT if pretrained else None
            self.model = deeplabv3_resnet101(weights=weights_arg, aux_loss=torchvision_model_init_with_aux)
            first_conv_layer_path = "backbone.conv1"
        elif backbone_name == 'mobilenet_v3_large':
            weights_arg: Optional[DeepLabV3_MobileNet_V3_Large_Weights] = DeepLabV3_MobileNet_V3_Large_Weights.DEFAULT if pretrained else None
            self.model = deeplabv3_mobilenet_v3_large(weights=weights_arg, aux_loss=torchvision_model_init_with_aux)
            # MobileNetV3-Large 的第一个卷积层在 backbone 的 '0' 序列的第一个模块
            first_conv_layer_path = "backbone.0.0"
        else:
            raise ValueError(f"Unsupported backbone: {backbone_name}. Choose 'resnet50', 'resnet101', or 'mobilenet_v3_large'.")

        # 1. 修改主干网络的输入层 (如果 in_channels 不是 3)
        if self.in_channels != 3:
            # 解析路径获取原始卷积层
            path_parts = first_conv_layer_path.split('.')
            current_module = self.model
            for part in path_parts[:-1]:
                current_module = getattr(current_module, part)
            original_conv1_name = path_parts[-1]
            original_conv1 = getattr(current_module, original_conv1_name)

            new_conv1 = nn.Conv2d(
                self.in_channels,
                original_conv1.out_channels,
                kernel_size=original_conv1.kernel_size,
                stride=original_conv1.stride,
                padding=original_conv1.padding,
                bias=(original_conv1.bias is not None),
                groups=original_conv1.groups # MobileNetV3的第一个卷积层可能是分组卷积，也可能不是，通常不是
            )

            if pretrained and original_conv1.in_channels == 3:
                original_weights = original_conv1.weight.data
                new_weights = new_conv1.weight.data.zero_()

                if self.in_channels > 3:
                    new_weights[:, :3, :, :] = original_weights.clone()
                    mean_rgb_weights = original_weights.mean(dim=1, keepdim=True)
                    for i in range(3, self.in_channels):
                        new_weights[:, i, :, :] = mean_rgb_weights.squeeze(dim=1).clone()
                elif self.in_channels == 1:
                    grayscale_weights = original_weights.mean(dim=1, keepdim=True)
                    new_weights[:, 0, :, :] = grayscale_weights.squeeze(dim=1).clone()
                elif self.in_channels == 2:
                    new_weights[:, :2, :, :] = original_weights[:, :2, :, :].clone()
                new_conv1.weight.data = new_weights
            
            setattr(current_module, original_conv1_name, new_conv1) # 替换原始卷积层

        # 2. 修改主分类器以适应新的类别数
        # DeepLabV3Head 和 FCNHead 的最后一个层都是 Conv2d
        original_classifier_last_layer = self.model.classifier[-1]
        self.model.classifier[-1] = nn.Conv2d(
            original_classifier_last_layer.in_channels,
            self.num_classes,
            kernel_size=original_classifier_last_layer.kernel_size,
            stride=original_classifier_last_layer.stride
        )

        # 3. 处理辅助分类器 (如果存在且用户启用)
        if hasattr(self.model, 'aux_classifier') and self.model.aux_classifier is not None:
            if self.aux_loss_enabled_by_user:
                original_aux_classifier_last_layer = self.model.aux_classifier[-1]
                self.model.aux_classifier[-1] = nn.Conv2d(
                    original_aux_classifier_last_layer.in_channels,
                    self.num_classes,
                    kernel_size=original_aux_classifier_last_layer.kernel_size,
                    stride=original_aux_classifier_last_layer.stride
                )

    def forward(self, x: torch.Tensor) -> Union[torch.Tensor, Dict[str, torch.Tensor]]:
        output_dict = self.model(x)
        if self.training and self.aux_loss_enabled_by_user and 'aux' in output_dict:
             return output_dict
        return output_dict['out']

def count_parameters(model):
    return sum(p.numel() for p in model.parameters() if p.requires_grad)

if __name__ == '__main__':
    print("--- 测试 DeepLabV3+ ---")

    print("\n--- ResNet50 Backbone (相对较多参数) ---")
    model_resnet50 = DeepLabV3Plus(in_channels=3, num_classes=10, backbone_name='resnet50', pretrained=False)
    dummy_input_resnet50 = torch.randn(1, 3, 224, 224)
    output_resnet50 = model_resnet50(dummy_input_resnet50)
    print(f"ResNet50 Output shape: {output_resnet50.shape}")
    print(f"ResNet50 Parameters: {count_parameters(model_resnet50):,}") # 约 39M (COCO 21类时)

    print("\n--- MobileNetV3-Large Backbone (参数量显著减少) ---")
    model_mobilenet = DeepLabV3Plus(in_channels=3, num_classes=10, backbone_name='mobilenet_v3_large', pretrained=False)
    dummy_input_mobilenet = torch.randn(1, 3, 224, 224)
    output_mobilenet = model_mobilenet(dummy_input_mobilenet)
    print(f"MobileNetV3-Large Output shape: {output_mobilenet.shape}")
    print(f"MobileNetV3-Large Parameters (for 10 classes): {count_parameters(model_mobilenet):,}") # 约 3-4M (COCO 21类时约 3.2M)

    # 测试多通道输入和预训练
    print("\n--- MobileNetV3-Large (4 in_channels, 5 classes, pretrained) ---")
    model_multi_channel_mobilenet = DeepLabV3Plus(in_channels=4, num_classes=5, backbone_name='mobilenet_v3_large', pretrained=True, aux_loss_enabled_for_wrapper=True)
    model_multi_channel_mobilenet.train()
    dummy_input_multi = torch.randn(1, 4, 224, 224)
    output_multi_dict = model_multi_channel_mobilenet(dummy_input_multi)
    if isinstance(output_multi_dict, dict):
        print(f"Multi-channel MobileNetV3 Main Output shape: {output_multi_dict['out'].shape}")
        print(f"Multi-channel MobileNetV3 Aux Output shape: {output_multi_dict['aux'].shape}")
    else:
        print(f"Multi-channel MobileNetV3 Output shape: {output_multi_dict.shape}")
    print(f"Multi-channel MobileNetV3 Parameters: {count_parameters(model_multi_channel_mobilenet):,}")
    
    # 检查 MobileNetV3 的第一个卷积层是否被正确替换
    # 打印相关层信息
    print("\n--- 检查 MobileNetV3-Large 的层修改 ---")
    # 路径 `model.backbone[0][0]`
    first_conv_mobilenet = model_multi_channel_mobilenet.model.backbone[0][0]
    print(f"MobileNetV3 first conv layer: {first_conv_mobilenet}")
    assert first_conv_mobilenet.in_channels == 4, "Input channels not modified correctly for MobileNetV3"
    
    classifier_last_layer_mobilenet = model_multi_channel_mobilenet.model.classifier[-1]
    print(f"MobileNetV3 classifier last layer: {classifier_last_layer_mobilenet}")
    assert classifier_last_layer_mobilenet.out_channels == 5, "Num classes not modified correctly for MobileNetV3 classifier"

    if hasattr(model_multi_channel_mobilenet.model, 'aux_classifier') and model_multi_channel_mobilenet.model.aux_classifier:
        aux_classifier_last_layer_mobilenet = model_multi_channel_mobilenet.model.aux_classifier[-1]
        print(f"MobileNetV3 aux_classifier last layer: {aux_classifier_last_layer_mobilenet}")
        assert aux_classifier_last_layer_mobilenet.out_channels == 5, "Num classes not modified correctly for MobileNetV3 aux_classifier"

    print("\n测试完成。")