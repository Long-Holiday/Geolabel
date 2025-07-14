package com.example.labelMark.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.annotation.Resource;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * 任务执行服务类，负责管理和执行各种任务
 */
@Service
public class TaskExecutorService {
    private static final Logger logger = LoggerFactory.getLogger(TaskExecutorService.class);

    @Resource
    private ThreadPoolExecutor assistFunctionExecutor;

    @Resource
    private ThreadPoolExecutor inferenceFunctionExecutor;

    @Autowired
    private RestTemplate restTemplate;

    @Resource
    private TaskNotificationService taskNotificationService;

    /**
     * 异步执行辅助功能任务
     *
     * @param requestBody 请求体
     * @return 异步执行结果
     */
    public CompletableFuture<Map<String, Object>> executeAssistFunctionAsync(Map<String, Object> requestBody) {
        logger.info("提交辅助功能任务到队列: taskId={}, functionName={}", 
                requestBody.get("taskid"), requestBody.get("functionName"));
        
        return CompletableFuture.supplyAsync(() -> {
            logger.info("开始执行辅助功能任务: taskId={}, functionName={}",
                    requestBody.get("taskid"), requestBody.get("functionName"));
            
            String taskId = requestBody.get("taskid").toString();
            String userId = requestBody.get("user_id") != null ? requestBody.get("user_id").toString() : null;
            String functionName = requestBody.get("functionName").toString();
            String modelName = requestBody.get("modelName") != null ? requestBody.get("modelName").toString() : "";
            
            try {
                String url = "http://localhost:5000/assistFunction";
                Map<String, Object> response = restTemplate.postForObject(url, requestBody, Map.class);
                logger.info("辅助功能任务执行完成: taskId={}", taskId);
                
                // 不再在这里发送通知，改为通过回调机制
                
                return response;
            } catch (Exception e) {
                logger.error("辅助功能任务执行异常: taskId={}, error={}", taskId, e.getMessage(), e);
                
                // 发送失败通知（超时等异常情况）
                if (userId != null) {
                    taskNotificationService.sendTrainCompleteNotification(userId, taskId, modelName, false, "训练失败: " + e.getMessage());
                }
                
                throw new RuntimeException("执行辅助功能任务失败: " + e.getMessage(), e);
            }
        }, assistFunctionExecutor);
    }

    /**
     * 异步执行批量辅助功能任务
     *
     * @param requestBody 请求体
     * @return 异步执行结果
     */
    @SuppressWarnings("unchecked")
    public CompletableFuture<Map<String, Object>> executeMultiAssistFunctionAsync(Map<String, Object> requestBody) {
        logger.info("提交批量辅助功能任务到队列: taskIds={}, functionName={}", 
                requestBody.get("taskid"), requestBody.get("functionName"));
        
        return CompletableFuture.supplyAsync(() -> {
            logger.info("开始执行批量辅助功能任务: taskIds={}, functionName={}",
                    requestBody.get("taskid"), requestBody.get("functionName"));
            
            List<String> taskIds = (List<String>) requestBody.get("taskid");
            String userId = requestBody.get("user_id") != null ? requestBody.get("user_id").toString() : null;
            String functionName = requestBody.get("functionName").toString();
            String modelName = requestBody.get("modelName") != null ? requestBody.get("modelName").toString() : "";
            
            try {
                String url = "http://localhost:5000/Multi_assistFunction";
                Map<String, Object> response = restTemplate.postForObject(url, requestBody, Map.class);
                logger.info("批量辅助功能任务执行完成: taskIds={}", taskIds);
                
                // 不再在这里发送通知，改为通过回调机制
                
                return response;
            } catch (Exception e) {
                logger.error("批量辅助功能任务执行异常: taskIds={}, error={}", taskIds, e.getMessage(), e);
                
                // 发送失败通知（超时等异常情况）
                if (userId != null) {
                    taskNotificationService.sendBatchTrainCompleteNotification(userId, taskIds, modelName, false, "批量训练失败: " + e.getMessage());
                }
                
                throw new RuntimeException("执行批量辅助功能任务失败: " + e.getMessage(), e);
            }
        }, assistFunctionExecutor);
    }

    /**
     * 异步执行推理功能任务
     *
     * @param requestBody 请求体
     * @return 异步执行结果
     */
    public CompletableFuture<Map<String, Object>> executeInferenceFunctionAsync(Map<String, Object> requestBody) {
        logger.info("提交推理功能任务到队列: taskId={}, model={}", 
                requestBody.get("taskid"), requestBody.get("model"));
        
        return CompletableFuture.supplyAsync(() -> {
            logger.info("开始执行推理功能任务: taskId={}, model={}",
                    requestBody.get("taskid"), requestBody.get("model"));
            
            String taskId = requestBody.get("taskid").toString();
            String userId = requestBody.get("user_id") != null ? requestBody.get("user_id").toString() : null;
            String modelName = requestBody.get("model") != null ? requestBody.get("model").toString() : "";
            
            try {
                String url = "http://localhost:5000/inferenceFunction";
                Map<String, Object> response = restTemplate.postForObject(url, requestBody, Map.class);
                logger.info("推理功能任务执行完成: taskId={}", taskId);
                
                // 不再在这里发送通知，改为通过回调机制
                
                return response;
            } catch (Exception e) {
                logger.error("推理功能任务执行异常: taskId={}, error={}", taskId, e.getMessage(), e);
                
                // 发送失败通知（超时等异常情况）
                if (userId != null) {
                    taskNotificationService.sendInferenceCompleteNotification(userId, taskId, modelName, false, "推理失败: " + e.getMessage());
                }
                
                throw new RuntimeException("执行推理功能任务失败: " + e.getMessage(), e);
            }
        }, inferenceFunctionExecutor);
    }
    
    /**
     * 异步执行更新标签任务
     *
     * @param requestBody 请求体
     * @return 异步执行结果
     */
    public CompletableFuture<Map<String, Object>> executeUpdateLabelAsync(Map<String, Object> requestBody) {
        logger.info("提交更新标签任务到队列: taskId={}", requestBody.get("taskid"));
        
        return CompletableFuture.supplyAsync(() -> {
            logger.info("开始执行更新标签任务: taskId={}", requestBody.get("taskid"));
            try {
                String url = "http://localhost:5000/update_label";
                Map<String, Object> response = restTemplate.postForObject(url, requestBody, Map.class);
                logger.info("更新标签任务执行完成: taskId={}", requestBody.get("taskid"));
                return response;
            } catch (Exception e) {
                logger.error("更新标签任务执行异常: taskId={}, error={}", requestBody.get("taskid"), e.getMessage(), e);
                throw new RuntimeException("执行更新标签任务失败: " + e.getMessage(), e);
            }
        }, assistFunctionExecutor); // 复用辅助功能线程池
    }
} 