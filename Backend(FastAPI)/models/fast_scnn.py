# models/fast_scnn.py
import torch
import torch.nn as nn

class FastSCNN(nn.Module):
    def __init__(self, in_channels, num_classes):
        super(FastSCNN, self).__init__()
        self.learning_to_downsample = nn.Sequential(
            nn.Conv2d(in_channels, 32, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True)
        )
        self.global_feature_extractor = nn.Sequential(
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2)
        )
        self.feature_fusion = nn.Conv2d(64, 64, kernel_size=1)
        self.classifier = nn.Sequential(
            nn.Upsample(scale_factor=4, mode='bilinear', align_corners=True),
            nn.Conv2d(64, num_classes, kernel_size=1)
        )

    def forward(self, x):
        x = self.learning_to_downsample(x)
        x = self.global_feature_extractor(x)
        x = self.feature_fusion(x)
        x = self.classifier(x)
        return x