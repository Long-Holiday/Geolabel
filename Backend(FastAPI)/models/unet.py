# # models/unet.py
# import torch
# import torch.nn as nn

# class DoubleConv(nn.Module):
#     def __init__(self, in_channels, out_channels, mid_channels=None):
#         super().__init__()
#         if not mid_channels:
#             mid_channels = out_channels
#         self.double_conv = nn.Sequential(
#             nn.Conv2d(in_channels, mid_channels, kernel_size=3, padding=1),
#             nn.BatchNorm2d(mid_channels),
#             nn.ReLU(inplace=True),
#             nn.Conv2d(mid_channels, out_channels, kernel_size=3, padding=1),
#             nn.BatchNorm2d(out_channels),
#             nn.ReLU(inplace=True)
#         )

#     def forward(self, x):
#         return self.double_conv(x)

# class Down(nn.Module):
#     def __init__(self, in_channels, out_channels):
#         super().__init__()
#         self.maxpool_conv = nn.Sequential(
#             nn.MaxPool2d(2),
#             DoubleConv(in_channels, out_channels)
#         )

#     def forward(self, x):
#         return self.maxpool_conv(x)

# class Up(nn.Module):
#     def __init__(self, in_channels, out_channels, bilinear=True):
#         super().__init__()
#         if bilinear:
#             self.up = nn.Upsample(scale_factor=2, mode='bilinear', align_corners=True)
#             self.conv = DoubleConv(in_channels, out_channels, in_channels // 2)
#         else:
#             self.up = nn.ConvTranspose2d(in_channels, in_channels // 2, kernel_size=2, stride=2)
#             self.conv = DoubleConv(in_channels, out_channels)

#     def forward(self, x1, x2):
#         x1 = self.up(x1)
#         diffY = x2.size()[2] - x1.size()[2]
#         diffX = x2.size()[3] - x1.size()[3]
#         x1 = nn.functional.pad(x1, [diffX // 2, diffX - diffX // 2,
#                                     diffY // 2, diffY - diffY // 2])
#         x = torch.cat([x2, x1], dim=1)
#         return self.conv(x)

# class OutConv(nn.Module):
#     def __init__(self, in_channels, out_channels):
#         super(OutConv, self).__init__()
#         self.conv = nn.Conv2d(in_channels, out_channels, kernel_size=1)

#     def forward(self, x):
#         return self.conv(x)

# class UNet(nn.Module):
#     def __init__(self, in_channels, num_classes, bilinear=True):
#         super(UNet, self).__init__()
#         self.inc = DoubleConv(in_channels, 64)
#         self.down1 = Down(64, 128)
#         self.down2 = Down(128, 256)
#         self.down3 = Down(256, 512)
#         factor = 2 if bilinear else 1
#         self.down4 = Down(512, 1024 // factor)
#         self.up1 = Up(1024, 512 // factor, bilinear)
#         self.up2 = Up(512, 256 // factor, bilinear)
#         self.up3 = Up(256, 128 // factor, bilinear)
#         self.up4 = Up(128, 64, bilinear)
#         self.outc = OutConv(64, num_classes)

#     def forward(self, x):
#         x1 = self.inc(x)
#         x2 = self.down1(x1)
#         x3 = self.down2(x2)
#         x4 = self.down3(x3)
#         x5 = self.down4(x4)
#         x = self.up1(x5, x4)
#         x = self.up2(x, x3)
#         x = self.up3(x, x2)
#         x = self.up4(x, x1)
#         logits = self.outc(x)
#         return logits

# 请将此代码保存为 /home/change/labelcode/FastAPI_DL/models/unet.py
# (如果该文件已存在且内容为此代码，则无需更改，只需关注如何实例化一个小模型)
import torch
import torch.nn as nn
import torch.nn.functional as F

class SeparableConv2d(nn.Module):
    def __init__(self, in_channels, out_channels, kernel_size, padding, bias=False):
        super(SeparableConv2d, self).__init__()
        self.depthwise = nn.Conv2d(in_channels, in_channels, kernel_size=kernel_size,
                                   padding=padding, groups=in_channels, bias=bias)
        self.pointwise = nn.Conv2d(in_channels, out_channels, kernel_size=1, bias=bias)

    def forward(self, x):
        x = self.depthwise(x)
        x = self.pointwise(x)
        return x

class SEAttention(nn.Module):
    def __init__(self, channel, reduction=16):
        super(SEAttention, self).__init__()
        self.avg_pool = nn.AdaptiveAvgPool2d(1)
        self.fc = nn.Sequential(
            nn.Linear(channel, max(1, channel // reduction), bias=False), #确保channel // reduction至少为1
            nn.ReLU(inplace=True),
            nn.Linear(max(1, channel // reduction), channel, bias=False),
            nn.Sigmoid()
        )

    def forward(self, x):
        b, c, _, _ = x.size()
        y = self.avg_pool(x).view(b, c)
        y = self.fc(y).view(b, c, 1, 1)
        return x * y.expand_as(x)

class DoubleConv(nn.Module):
    def __init__(self, in_channels, out_channels, mid_channels=None,
                 use_separable_conv=False, use_attention=False, use_residual=False, dropout_rate=0.0):
        super().__init__()
        if not mid_channels:
            mid_channels = out_channels

        ConvBlock = SeparableConv2d if use_separable_conv else nn.Conv2d
        self.use_residual = use_residual and (in_channels == out_channels)

        self.conv1 = ConvBlock(in_channels, mid_channels, kernel_size=3, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(mid_channels)
        self.relu1 = nn.ReLU(inplace=True)

        self.conv2 = ConvBlock(mid_channels, out_channels, kernel_size=3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(out_channels)
        
        self.attention = SEAttention(out_channels) if use_attention and out_channels > 0 else nn.Identity() # 仅当out_channels > 0
        
        self.dropout = nn.Dropout(dropout_rate) if dropout_rate > 0 else nn.Identity()
        
        if self.use_residual:
            self.residual_conv_projection = nn.Identity()
        elif use_residual and in_channels != out_channels:
            self.use_residual = False

        self.relu2 = nn.ReLU(inplace=True)

    def forward(self, x):
        identity = x
        out = self.conv1(x)
        out = self.bn1(out)
        out = self.relu1(out)
        out = self.dropout(out)
        out = self.conv2(out)
        out = self.bn2(out)
        out = self.attention(out)
        if self.use_residual:
            out += identity 
        out = self.relu2(out)
        return out

class Down(nn.Module):
    def __init__(self, in_channels, out_channels, double_conv_params):
        super().__init__()
        self.maxpool_conv = nn.Sequential(
            nn.MaxPool2d(2),
            DoubleConv(in_channels, out_channels, **double_conv_params)
        )

    def forward(self, x):
        return self.maxpool_conv(x)

class Up(nn.Module):
    def __init__(self, in_channels_low, in_channels_skip, out_channels, bilinear=True, double_conv_params=None):
        super().__init__()
        
        if bilinear:
            self.up = nn.Upsample(scale_factor=2, mode='bilinear', align_corners=True)
            conv_in_channels = in_channels_low + in_channels_skip
        else:
            # 确保 in_channels_low // 2 不为0，否则 ConvTranspose2d 会报错
            up_out_channels = max(1, in_channels_low // 2) if in_channels_low > 1 else 1
            self.up = nn.ConvTranspose2d(in_channels_low, up_out_channels, kernel_size=2, stride=2)
            conv_in_channels = up_out_channels + in_channels_skip
        
        current_mid_channels = conv_in_channels // 2 if double_conv_params.get('mid_channels') is None else double_conv_params.get('mid_channels')
        current_mid_channels = max(1, current_mid_channels) # 确保mid_channels至少为1
        
        self.conv = DoubleConv(conv_in_channels, out_channels, mid_channels=current_mid_channels, **double_conv_params)

    def forward(self, x1, x2):
        x1_up = self.up(x1)
        diffY = x2.size()[2] - x1_up.size()[2]
        diffX = x2.size()[3] - x1_up.size()[3]
        x1_padded = F.pad(x1_up, [diffX // 2, diffX - diffX // 2,
                                  diffY // 2, diffY - diffY // 2])
        x = torch.cat([x2, x1_padded], dim=1)
        return self.conv(x)

class OutConv(nn.Module):
    def __init__(self, in_channels, out_channels):
        super(OutConv, self).__init__()
        self.conv = nn.Conv2d(in_channels, out_channels, kernel_size=1)

    def forward(self, x):
        return self.conv(x)

class UNet(nn.Module):
    def __init__(self, in_channels, num_classes, bilinear=True,
                 base_channels=64, 
                 channel_mults=(1, 2, 4, 8, 16), 
                 use_separable_conv=False,
                 use_attention=False,
                 use_residual_double_conv=False,
                 dropout_rate=0.0):
        """
        UNet model.
        要创建一个参数量小的模型，请调整以下参数：
        - base_channels: 减小此值 (例如, 32, 16, 8).
        - channel_mults: 使用更短的元组 (例如, (1, 2, 4, 8) 或 (1, 2, 4)) 来减少网络深度.
                         或者使用更小的乘数值.
        - use_separable_conv: 设置为 True 来使用深度可分离卷积，显著减少参数.
        - use_attention: 设置为 False 来移除注意力模块.
        - use_residual_double_conv: 设置为 False 来移除DoubleConv中的残差连接.
        """
        super(UNet, self).__init__()
        
        self.double_conv_params = {
            'use_separable_conv': use_separable_conv,
            'use_attention': use_attention,
            'use_residual': use_residual_double_conv,
            'dropout_rate': dropout_rate
        }

        chs = [max(1, int(base_channels * m)) for m in channel_mults] # 确保通道数至少为1
        if not chs:
            raise ValueError("channel_mults cannot be empty")

        self.inc = DoubleConv(in_channels, chs[0], **self.double_conv_params)
        
        self.downs = nn.ModuleList()
        for i in range(len(chs) - 1):
            self.downs.append(Down(chs[i], chs[i+1], double_conv_params=self.double_conv_params))
            
        self.ups = nn.ModuleList()
        for i in range(len(chs) - 1, 0, -1):
            in_channels_low = chs[i] 
            in_channels_skip = chs[i-1] 
            out_channels_up = chs[i-1]
            self.ups.append(Up(in_channels_low, in_channels_skip, out_channels_up, 
                               bilinear, double_conv_params=self.double_conv_params))
            
        self.outc = OutConv(chs[0], num_classes)

    def forward(self, x):
        skip_connections = []
        x = self.inc(x)
        skip_connections.append(x)
        for i, down_layer in enumerate(self.downs):
            x = down_layer(x)
            if i < len(self.downs) -1 :
                 skip_connections.append(x)
        for i, up_layer in enumerate(self.ups):
            skip = skip_connections[len(skip_connections) - 1 - i]
            x = up_layer(x, skip)
        logits = self.outc(x)
        return logits

def count_parameters(model):
    return sum(p.numel() for p in model.parameters() if p.requires_grad)

if __name__ == '__main__':
    dummy_input = torch.randn(1, 3, 256, 256)
    num_classes = 2 # 示例类别数

    print("--- 标准 UNet (参考参数量) ---")
    # 接近原始UNet的配置，但未使用任何优化来减少参数
    unet_standard = UNet(in_channels=3, num_classes=num_classes,
                         base_channels=64, channel_mults=(1, 2, 4, 8, 16),
                         use_separable_conv=False, use_attention=False, use_residual_double_conv=False)
    output_standard = unet_standard(dummy_input)
    print(f"Standard UNet Output shape: {output_standard.shape}")
    print(f"Standard UNet Parameters: {count_parameters(unet_standard):,}") # 参数量较大

    print("\n--- 轻量级 UNet 方案 1 (较小 base_channels, 可分离卷积) ---")
    unet_light1 = UNet(in_channels=3, num_classes=num_classes,
                       base_channels=32,  # 减少基础通道
                       channel_mults=(1, 2, 4, 8),  # 减少深度/宽度
                       use_separable_conv=True,  # 关键！
                       use_attention=False,      # 可选关闭
                       use_residual_double_conv=False, # 可选关闭
                       bilinear=True)
    output_light1 = unet_light1(dummy_input)
    print(f"Light UNet 1 Output shape: {output_light1.shape}")
    print(f"Light UNet 1 Parameters: {count_parameters(unet_light1):,}")

    print("\n--- 轻量级 UNet 方案 2 (更小的 base_channels, 更浅的网络) ---")
    unet_light2 = UNet(in_channels=3, num_classes=num_classes,
                       base_channels=16,  # 进一步减少基础通道
                       channel_mults=(1, 2, 4),  # 更浅的网络
                       use_separable_conv=True,  # 关键！
                       use_attention=False,
                       use_residual_double_conv=False,
                       bilinear=True)
    output_light2 = unet_light2(dummy_input)
    print(f"Light UNet 2 Output shape: {output_light2.shape}")
    print(f"Light UNet 2 Parameters: {count_parameters(unet_light2):,}")

    print("\n--- 超轻量级 UNet 方案 3 (极小的 base_channels, 可分离卷积, 无额外模块) ---")
    unet_ultralight = UNet(in_channels=3, num_classes=num_classes,
                           base_channels=8,   # 极小的基础通道
                           channel_mults=(1, 2, 4), # 可以根据需要调整深度 (1,2,4,8)
                           use_separable_conv=True,   # 必须
                           use_attention=False,       # 关闭以减少参数
                           use_residual_double_conv=False, # 关闭以减少参数
                           bilinear=True)
    output_ultralight = unet_ultralight(dummy_input)
    print(f"UltraLight UNet Output shape: {output_ultralight.shape}")
    print(f"UltraLight UNet Parameters: {count_parameters(unet_ultralight):,}")
    
    print("\n--- 测试单通道输入和不同类别数 (轻量配置) ---")
    unet_custom_light = UNet(in_channels=1, num_classes=5, # 例如单通道输入，5个类别
                             base_channels=16,
                             channel_mults=(1, 2, 4, 8),
                             use_separable_conv=True,
                             use_attention=False, # 设为 True 以启用，但会增加参数
                             use_residual_double_conv=False, # 设为 True 以启用
                             dropout_rate=0.0) # 可以尝试加入dropout
    dummy_input_custom = torch.randn(1, 1, 128, 128)
    output_custom_light = unet_custom_light(dummy_input_custom)
    print(f"Custom Light UNet Output shape: {output_custom_light.shape}")
    print(f"Custom Light UNet Parameters: {count_parameters(unet_custom_light):,}")