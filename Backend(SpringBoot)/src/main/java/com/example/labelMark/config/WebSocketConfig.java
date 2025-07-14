package com.example.labelMark.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import javax.annotation.Resource;

/**
 * WebSocket配置类
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketConfig.class);

    @Resource
    private TaskNotificationHandler taskNotificationHandler;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        logger.info("注册WebSocket处理器: /ws/task-notifications");
        // 注册WebSocket处理器，允许跨域
        registry.addHandler(taskNotificationHandler, "/ws/task-notifications")
                .setAllowedOriginPatterns("*");  // 使用setAllowedOriginPatterns代替setAllowedOrigins
    }
} 