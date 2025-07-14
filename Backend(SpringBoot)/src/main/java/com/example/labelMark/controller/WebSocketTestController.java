package com.example.labelMark.controller;

import com.example.labelMark.config.TaskNotificationHandler;
import com.example.labelMark.service.TaskNotificationService;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import java.util.HashMap;
import java.util.Map;

/**
 * WebSocket测试控制器
 */
@RestController
@RequestMapping("/websocket-test")
public class WebSocketTestController {

    @Resource
    private TaskNotificationService taskNotificationService;

    @Resource
    private TaskNotificationHandler taskNotificationHandler;

    /**
     * 测试发送消息给指定用户
     */
    @PostMapping("/send-message")
    public Map<String, Object> sendTestMessage(@RequestParam String userId, @RequestParam String message) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // 检查用户是否在线
            boolean isOnline = taskNotificationService.isUserOnline(userId);
            
            if (isOnline) {
                // 发送测试消息
                taskNotificationService.sendBatchTrainCompleteNotification(
                    userId, 
                    java.util.Arrays.asList("test-task-1", "test-task-2"), 
                    "test-model", 
                    true, 
                    message
                );
                response.put("code", 200);
                response.put("message", "测试消息已发送");
            } else {
                response.put("code", 400);
                response.put("message", "用户未连接WebSocket");
            }
            
            response.put("userOnline", isOnline);
            response.put("connectionCount", taskNotificationService.getConnectionCount());
            
        } catch (Exception e) {
            response.put("code", 500);
            response.put("message", "发送消息失败: " + e.getMessage());
        }
        
        return response;
    }

    /**
     * 获取WebSocket连接状态
     */
    @GetMapping("/status")
    public Map<String, Object> getWebSocketStatus() {
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("connectionCount", taskNotificationService.getConnectionCount());
        response.put("message", "WebSocket服务正常运行");
        return response;
    }
} 