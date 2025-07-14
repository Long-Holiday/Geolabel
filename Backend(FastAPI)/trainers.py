# # trainers.py
# import torch
# import torch.nn as nn
# import torch.optim as optim
# import numpy as np

# def train_torch_model(model, dataloader, criterion, optimizer, num_epochs, device):
#     model.train()
#     for epoch in range(num_epochs):
#         running_loss = 0.0
#         for images, masks in dataloader:
#             images = images.to(device)
#             masks = masks.to(device)
#             optimizer.zero_grad()
#             outputs = model(images)
#             # 调整输出尺寸以匹配目标
#             if outputs.shape[2:] != masks.shape[1:]:
#                 outputs = torch.nn.functional.interpolate(outputs, size=masks.shape[1:], mode='bilinear', align_corners=False)
#             print(f"Adjusted outputs shape: {outputs.shape}, masks shape: {masks.shape}")
#             loss = criterion(outputs, masks)
#             loss.backward()
#             optimizer.step()
#             running_loss += loss.item()
#         print(f"Epoch [{epoch+1}/{num_epochs}], Loss: {running_loss / len(dataloader):.4f}")
#     print(f"{model.__class__.__name__} 训练完成!")

# def predict_torch_model(model, image_tensor, device):
#     model.eval()
#     with torch.no_grad():
#         image_tensor = image_tensor.unsqueeze(0).to(device)
#         outputs = model(image_tensor)
#         # 调整输出尺寸以匹配输入图像
#         if outputs.shape[2:] != image_tensor.shape[2:]:
#             outputs = torch.nn.functional.interpolate(outputs, size=image_tensor.shape[2:], mode='bilinear', align_corners=False)
#         probabilities = torch.softmax(outputs, dim=1)
#         predicted_mask = torch.argmax(probabilities, dim=1).squeeze().cpu().numpy()
#     return predicted_mask.astype(np.uint8)

# def train_sklearn_model(model, X, y):
#     model.train(X, y)
#     print(f"{model.__class__.__name__} 训练完成!")

# def predict_sklearn_model(model, X, image_shape):
#     predictions = model.predict(X)
#     return predictions.reshape(image_shape[1], image_shape[2]).astype(np.uint8)

'''新增保存模型方法'''
import joblib
from matplotlib import pyplot as plt
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import os

def train_torch_model(model, dataloader, criterion, optimizer, num_epochs, device, model_save_path, 
                      patience=10, min_delta=0.001):
    """
    训练 PyTorch 模型，基于训练集损失收敛的早停机制，记录损失，并在训练完成后绘制并保存损失曲线图。

    参数:
        model: PyTorch 模型
        dataloader: 数据加载器
        criterion: 损失函数
        optimizer: 优化器
        num_epochs: 最大训练轮数
        device: 训练设备（CPU 或 GPU）
        model_save_path: 模型保存路径
        patience: 早停的耐心值，即在多少个epoch内损失改进小于min_delta时停止训练（默认值为10）
        min_delta: 损失改进的最小阈值，用于判断损失是否收敛（默认值为0.001）
    """
    model.train()
    
    # 记录每个 epoch 的平均损失
    losses = []
    best_loss = float('inf')  # 初始化最佳损失为正无穷
    patience_counter = 0      # 耐心计数器

    for epoch in range(num_epochs):
        running_loss = 0.0
        for images, masks,_ in dataloader:
            images = images.to(device)
            masks = masks.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            # 调整输出尺寸以匹配目标
            if outputs.shape[2:] != masks.shape[1:]:
                outputs = torch.nn.functional.interpolate(outputs, size=masks.shape[1:], mode='bilinear', align_corners=False)
            loss = criterion(outputs, masks)
            loss.backward()
            optimizer.step()
            running_loss += loss.item()
        
        # 计算并记录每个 epoch 的平均损失
        epoch_loss = running_loss / len(dataloader)
        losses.append(epoch_loss)
        print(f"Epoch [{epoch+1}/{num_epochs}], Loss: {epoch_loss:.4f}")
        
        # 早停逻辑：基于损失收敛
        if epoch > 0:  # 从第二个 epoch 开始比较
            loss_improvement = losses[epoch - 1] - epoch_loss  # 上一个epoch的损失减去当前损失
            if loss_improvement < min_delta:  # 如果改进小于阈值
                patience_counter += 1
                print(f"Loss improvement ({loss_improvement:.6f}) < min_delta ({min_delta}), "
                      f"Patience counter: {patience_counter}/{patience}")
            else:
                patience_counter = 0  # 重置计数器
                
            # 如果当前损失是最佳的，保存模型
            if epoch_loss < best_loss:
                best_loss = epoch_loss
                try:
                    os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
                    torch.save(model.state_dict(), model_save_path)
                    # model_scripted = torch.jit.script(model) # Export to TorchScript
                    # model_scripted.save(model_save_path)
                    print(f"模型已保存至: {model_save_path} (Best Loss: {best_loss:.4f})")
                except Exception as e:
                    print(f"保存模型时出错: {e}")
        
        # 触发早停
        if patience_counter >= patience:
            print(f"早停触发于第 {epoch+1} 个epoch，损失已收敛")
            break
    
    print(f"{model.__class__.__name__} 训练完成!")
    
    # 绘制并保存损失曲线图
    plt.figure(figsize=(10, 6))
    plt.plot(range(1, len(losses) + 1), losses, marker='o', linestyle='-', color='b')
    plt.title('Training Loss over Epochs')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.grid(True)
    
    # 保存损失曲线图到与模型相同的目录
    loss_plot_path = os.path.join(os.path.dirname(model_save_path), 'training_loss.png')
    plt.savefig(loss_plot_path)
    print(f"训练损失曲线图已保存至: {loss_plot_path}")
    plt.close()  # 关闭图表以释放内存

def predict_torch_model(model, image_tensor, device):
    model.eval()
    with torch.no_grad():
        image_tensor = image_tensor.unsqueeze(0).to(device)
        # padded_input = torch.nn.functional.pad(image_tensor, (8, 8, 8, 8), mode='reflect')
        outputs = model(image_tensor)
        # 裁剪回原始尺寸
        # h, w = image_tensor.shape[2:]
        # outputs = outputs[:, :, 8:8+h, 8:8+w]
        # 调整输出尺寸以匹配输入图像
        if outputs.shape[2:] != image_tensor.shape[2:]:
            outputs = torch.nn.functional.interpolate(outputs, size=image_tensor.shape[2:], mode='bilinear', align_corners=False)
        probabilities = torch.softmax(outputs, dim=1)
        predicted_mask = torch.argmax(probabilities, dim=1).squeeze().cpu().numpy()
    return predicted_mask.astype(np.uint8)

def train_sklearn_model(model, X, y, model_save_path):
    """
    使用XGBoost官方API训练模型，不保存训练过程文件
    
    参数:
        model: XGBoost模型实例
        X: 特征矩阵
        y: 标签向量
        model_save_path: 模型保存路径
    """
    # 直接调用模型的train方法
    model.train(X, y)
    
    # 保存模型
    try:
        os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
        model.save_model(model_save_path)  # 使用XGBoost的save_model方法
        print(f"模型已保存至: {model_save_path}")
    except Exception as e:
        print(f"保存模型时出错: {e}")

def predict_sklearn_model(model, X, image_shape):
    """
    使用XGBoost官方API进行预测
    
    参数:
        model: XGBoost模型实例
        X: 特征矩阵
        image_shape: 原始图像形状，用于重塑预测结果
        
    返回:
        重塑后的预测掩码
    """
    # 直接调用模型的predict方法
    predictions = model.predict(X)
    
    # 将预测结果重塑为原始图像形状
    return predictions.reshape(image_shape[1], image_shape[2]).astype(np.uint8)