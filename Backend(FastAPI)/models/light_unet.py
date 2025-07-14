import torch
import torch.nn as nn

class LightUNet(nn.Module):
    def __init__(self, in_channels, num_classes):
        super(LightUNet, self).__init__()
        self.encoder_conv1 = nn.Conv2d(in_channels, 32, kernel_size=3, padding=1)
        self.encoder_conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.pool = nn.MaxPool2d(kernel_size=2, stride=2)
        self.decoder_upconv1 = nn.ConvTranspose2d(64, 32, kernel_size=2, stride=2)
        self.decoder_conv1 = nn.Conv2d(32 + 32, 32, kernel_size=3, padding=1)
        self.decoder_conv2 = nn.Conv2d(32, num_classes, kernel_size=1)
        self.relu = nn.ReLU()

    def forward(self, x):
        enc1 = self.relu(self.encoder_conv1(x))
        enc2 = self.relu(self.encoder_conv2(self.pool(enc1)))
        dec1 = self.decoder_upconv1(enc2)
        dec1_upsampled = torch.nn.functional.interpolate(dec1, size=enc1.shape[-2:], mode='bilinear', align_corners=False)
        dec1_concat = torch.cat([dec1_upsampled, enc1], dim=1)
        dec2 = self.relu(self.decoder_conv1(dec1_concat))
        output = self.decoder_conv2(dec2)
        return output

# import torch
# import torch.nn as nn
# import segmentation_models_pytorch as smp

# class LightUNet(nn.Module):
#     def __init__(self, in_channels, num_classes, encoder_name='resnet34', encoder_weights='imagenet'):
#         super(LightUNet, self).__init__()
#         # 新增卷积层将多通道影像转换为3通道
#         self.input_conv = nn.Conv2d(in_channels, 3, kernel_size=3, padding=1)
#         self.input_bn = nn.BatchNorm2d(3)
#         self.input_relu = nn.ReLU(inplace=True)
        
#         # 使用 segmentation_models_pytorch 的 UNet 模型
#         self.unet = smp.Unet(
#             encoder_name=encoder_name,        # 使用指定的预训练编码器
#             encoder_weights=encoder_weights,  # 使用 ImageNet 预训练权重
#             in_channels=3,                    # 输入通道固定为3
#             classes=num_classes,              # 输出类别数
#             activation=None                   # 根据需要设置激活函数
#         )

#     def _pad_to_divisible(self, x, divisible_by=32):
#         """Pad input tensor to make height and width divisible by divisible_by."""
#         _, _, h, w = x.shape
#         # Calculate padding to make dimensions divisible by 32
#         pad_h = (divisible_by - (h % divisible_by)) % divisible_by
#         pad_w = (divisible_by - (w % divisible_by)) % divisible_by
#         # Symmetric padding (left, right, top, bottom)
#         padding = (pad_w // 2, pad_w - pad_w // 2, pad_h // 2, pad_h - pad_h // 2)
#         x_padded = torch.nn.functional.pad(x, padding, mode='constant', value=0)
#         return x_padded, padding

#     def _crop_to_original(self, x, original_shape, padding):
#         """Crop the output tensor to the original input shape."""
#         _, _, h_orig, w_orig = original_shape
#         pad_left, pad_right, pad_top, pad_bottom = padding
#         # Crop to original dimensions
#         return x[:, :, pad_top:pad_top + h_orig, pad_left:pad_left + w_orig]

#     def forward(self, x):
#         # Store original shape
#         original_shape = x.shape
        
#         # Pad input to make dimensions divisible by 32
#         x_padded, padding = self._pad_to_divisible(x, divisible_by=32)
        
#         # Convert multi-channel input to 3 channels
#         x = self.input_conv(x_padded)
#         x = self.input_bn(x)
#         x = self.input_relu(x)
        
#         # Pass through UNet
#         output = self.unet(x)
        
#         # Crop output to original input dimensions
#         output = self._crop_to_original(output, original_shape, padding)
        
#         return output