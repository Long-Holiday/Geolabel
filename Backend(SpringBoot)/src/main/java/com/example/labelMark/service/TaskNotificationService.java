package com.example.labelMark.service;

import com.example.labelMark.config.TaskNotificationHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 任务通知服务
 */
@Service
public class TaskNotificationService {

    private static final Logger logger = LoggerFactory.getLogger(TaskNotificationService.class);

    @Resource
    private TaskNotificationHandler taskNotificationHandler;

    /**
     * 发送批量训练完成通知
     */
    public void sendBatchTrainCompleteNotification(String userId, List<String> taskIds, String modelName, boolean success, String message) {
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "BATCH_TRAIN_COMPLETE");
        notification.put("userId", userId);
        notification.put("taskIds", taskIds);
        notification.put("modelName", modelName);
        notification.put("success", success);
        notification.put("message", message);
        notification.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        
        // 发送给指定用户
        taskNotificationHandler.sendMessageToUser(userId, notification);
        
        logger.info("发送批量训练完成通知给用户 {}: 任务IDs={}, 模型={}, 成功={}", 
                userId, taskIds, modelName, success);
    }

    /**
     * 发送批量推理完成通知
     */
    public void sendBatchInferenceCompleteNotification(String userId, List<String> taskIds, String modelName, boolean success, String message) {
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "BATCH_INFERENCE_COMPLETE");
        notification.put("userId", userId);
        notification.put("taskIds", taskIds);
        notification.put("modelName", modelName);
        notification.put("success", success);
        notification.put("message", message);
        notification.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        
        // 发送给指定用户
        taskNotificationHandler.sendMessageToUser(userId, notification);
        
        logger.info("发送批量推理完成通知给用户 {}: 任务IDs={}, 模型={}, 成功={}", 
                userId, taskIds, modelName, success);
    }

    /**
     * 发送单个训练完成通知
     */
    public void sendTrainCompleteNotification(String userId, String taskId, String modelName, boolean success, String message) {
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "TRAIN_COMPLETE");
        notification.put("userId", userId);
        notification.put("taskId", taskId);
        notification.put("modelName", modelName);
        notification.put("success", success);
        notification.put("message", message);
        notification.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        
        // 发送给指定用户
        taskNotificationHandler.sendMessageToUser(userId, notification);
        
        logger.info("发送训练完成通知给用户 {}: 任务ID={}, 模型={}, 成功={}", 
                userId, taskId, modelName, success);
    }

    /**
     * 发送单个推理完成通知
     */
    public void sendInferenceCompleteNotification(String userId, String taskId, String modelName, boolean success, String message) {
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "INFERENCE_COMPLETE");
        notification.put("userId", userId);
        notification.put("taskId", taskId);
        notification.put("modelName", modelName);
        notification.put("success", success);
        notification.put("message", message);
        notification.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        
        // 发送给指定用户
        taskNotificationHandler.sendMessageToUser(userId, notification);
        
        logger.info("发送推理完成通知给用户 {}: 任务ID={}, 模型={}, 成功={}", 
                userId, taskId, modelName, success);
    }

    /**
     * 发送任务进度通知
     */
    public void sendTaskProgressNotification(String userId, String taskId, String taskType, int progress, String message) {
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "TASK_PROGRESS");
        notification.put("userId", userId);
        notification.put("taskId", taskId);
        notification.put("taskType", taskType);
        notification.put("progress", progress);
        notification.put("message", message);
        notification.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        
        // 发送给指定用户
        taskNotificationHandler.sendMessageToUser(userId, notification);
        
        logger.debug("发送任务进度通知给用户 {}: 任务ID={}, 进度={}%", userId, taskId, progress);
    }

    /**
     * 检查用户是否在线
     */
    public boolean isUserOnline(String userId) {
        return taskNotificationHandler.isUserConnected(userId);
    }

    /**
     * 获取当前WebSocket连接数
     */
    public int getConnectionCount() {
        return taskNotificationHandler.getConnectionCount();
    }
} 