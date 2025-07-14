package com.example.labelMark.controller;

import com.example.labelMark.service.TaskNotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 任务完成回调控制器
 * 用于接收FastAPI的任务完成通知
 */
@RestController
@RequestMapping("/task-callback")
public class TaskCallbackController {

    private static final Logger logger = LoggerFactory.getLogger(TaskCallbackController.class);

    @Resource
    private TaskNotificationService taskNotificationService;

    /**
     * 单个训练任务完成回调
     */
    @PostMapping("/train-complete")
    public Map<String, Object> onTrainComplete(@RequestBody Map<String, Object> request) {
        try {
            String taskId = request.get("taskId").toString();
            String userId = request.get("userId").toString();
            String modelName = request.get("modelName") != null ? request.get("modelName").toString() : "";
            boolean success = Boolean.parseBoolean(request.get("success").toString());
            String message = request.get("message") != null ? request.get("message").toString() : "";

            logger.info("收到训练完成回调: taskId={}, userId={}, success={}", taskId, userId, success);

            // 发送WebSocket通知
            taskNotificationService.sendTrainCompleteNotification(userId, taskId, modelName, success, message);

            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "回调处理成功");
            return response;

        } catch (Exception e) {
            logger.error("处理训练完成回调失败", e);
            Map<String, Object> response = new HashMap<>();
            response.put("code", 500);
            response.put("message", "回调处理失败: " + e.getMessage());
            return response;
        }
    }

    /**
     * 批量训练任务完成回调
     */
    @PostMapping("/batch-train-complete")
    public Map<String, Object> onBatchTrainComplete(@RequestBody Map<String, Object> request) {
        try {
            @SuppressWarnings("unchecked")
            List<String> taskIds = (List<String>) request.get("taskIds");
            String userId = request.get("userId").toString();
            String modelName = request.get("modelName") != null ? request.get("modelName").toString() : "";
            boolean success = Boolean.parseBoolean(request.get("success").toString());
            String message = request.get("message") != null ? request.get("message").toString() : "";

            logger.info("收到批量训练完成回调: taskIds={}, userId={}, success={}", taskIds, userId, success);

            // 发送WebSocket通知
            taskNotificationService.sendBatchTrainCompleteNotification(userId, taskIds, modelName, success, message);

            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "回调处理成功");
            return response;

        } catch (Exception e) {
            logger.error("处理批量训练完成回调失败", e);
            Map<String, Object> response = new HashMap<>();
            response.put("code", 500);
            response.put("message", "回调处理失败: " + e.getMessage());
            return response;
        }
    }

    /**
     * 单个推理任务完成回调
     */
    @PostMapping("/inference-complete")
    public Map<String, Object> onInferenceComplete(@RequestBody Map<String, Object> request) {
        try {
            String taskId = request.get("taskId").toString();
            String userId = request.get("userId").toString();
            String modelName = request.get("modelName") != null ? request.get("modelName").toString() : "";
            boolean success = Boolean.parseBoolean(request.get("success").toString());
            String message = request.get("message") != null ? request.get("message").toString() : "";

            logger.info("收到推理完成回调: taskId={}, userId={}, success={}", taskId, userId, success);

            // 发送WebSocket通知
            taskNotificationService.sendInferenceCompleteNotification(userId, taskId, modelName, success, message);

            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "回调处理成功");
            return response;

        } catch (Exception e) {
            logger.error("处理推理完成回调失败", e);
            Map<String, Object> response = new HashMap<>();
            response.put("code", 500);
            response.put("message", "回调处理失败: " + e.getMessage());
            return response;
        }
    }

    /**
     * 批量推理任务完成回调
     */
    @PostMapping("/batch-inference-complete")
    public Map<String, Object> onBatchInferenceComplete(@RequestBody Map<String, Object> request) {
        try {
            @SuppressWarnings("unchecked")
            List<String> taskIds = (List<String>) request.get("taskIds");
            String userId = request.get("userId").toString();
            String modelName = request.get("modelName") != null ? request.get("modelName").toString() : "";
            boolean success = Boolean.parseBoolean(request.get("success").toString());
            String message = request.get("message") != null ? request.get("message").toString() : "";

            logger.info("收到批量推理完成回调: taskIds={}, userId={}, success={}", taskIds, userId, success);

            // 发送WebSocket通知
            taskNotificationService.sendBatchInferenceCompleteNotification(userId, taskIds, modelName, success, message);

            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "回调处理成功");
            return response;

        } catch (Exception e) {
            logger.error("处理批量推理完成回调失败", e);
            Map<String, Object> response = new HashMap<>();
            response.put("code", 500);
            response.put("message", "回调处理失败: " + e.getMessage());
            return response;
        }
    }
} 