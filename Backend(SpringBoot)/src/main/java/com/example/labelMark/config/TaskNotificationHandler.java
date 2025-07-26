package com.example.labelMark.config;

import com.alibaba.fastjson.JSON;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

/**
 * WebSocket任务通知处理器
 */
@Component
public class TaskNotificationHandler implements WebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(TaskNotificationHandler.class);
    
    // 存储所有连接的WebSocket会话
    private static final CopyOnWriteArraySet<WebSocketSession> sessions = new CopyOnWriteArraySet<>();
    
    // 存储用户ID与WebSocket会话的映射关系
    private static final ConcurrentHashMap<String, WebSocketSession> userSessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessions.add(session);
        
        // 从查询参数中获取用户ID
        String userId = getUserIdFromSession(session);
        if (userId != null) {
            userSessions.put(userId, session);
            logger.info("用户 {} 建立WebSocket连接，会话ID: {}, 连接URI: {}", userId, session.getId(), session.getUri());
        } else {
            logger.info("WebSocket连接已建立，会话ID: {}, 连接URI: {}", session.getId(), session.getUri());
        }
        logger.info("当前WebSocket连接总数: {}", sessions.size());
    }

    @Override
    public void handleMessage(WebSocketSession session, WebSocketMessage<?> message) throws Exception {
        // 处理客户端发送的消息（如果需要）
        logger.debug("收到WebSocket消息: {}", message.getPayload());
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        logger.error("WebSocket传输错误，会话ID: {}", session.getId(), exception);
        removeSession(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) throws Exception {
        removeSession(session);
        logger.info("WebSocket连接已关闭，会话ID: {}，关闭状态: {}", session.getId(), closeStatus);
    }

    @Override
    public boolean supportsPartialMessages() {
        return false;
    }

    /**
     * 移除会话
     */
    private void removeSession(WebSocketSession session) {
        sessions.remove(session);
        
        // 从用户会话映射中移除
        String userId = getUserIdFromSession(session);
        if (userId != null) {
            userSessions.remove(userId);
        }
    }

    /**
     * 从会话中获取用户ID
     */
    private String getUserIdFromSession(WebSocketSession session) {
        try {
            String query = session.getUri().getQuery();
            if (query != null && query.contains("userId=")) {
                String[] params = query.split("&");
                for (String param : params) {
                    if (param.startsWith("userId=")) {
                        return param.substring("userId=".length());
                    }
                }
            }
        } catch (Exception e) {
            logger.warn("获取用户ID失败", e);
        }
        return null;
    }

    /**
     * 向指定用户发送消息
     */
    public void sendMessageToUser(String userId, Object message) {
        WebSocketSession session = userSessions.get(userId);
        if (session != null && session.isOpen()) {
            try {
                String jsonMessage = JSON.toJSONString(message);
                session.sendMessage(new TextMessage(jsonMessage));
                logger.info("向用户 {} 发送WebSocket消息: {}", userId, jsonMessage);
            } catch (IOException e) {
                logger.error("向用户 {} 发送WebSocket消息失败", userId, e);
                // 如果发送失败，移除该会话
                userSessions.remove(userId);
                sessions.remove(session);
            }
        } else {
            logger.warn("用户 {} 的WebSocket会话不存在或已关闭", userId);
        }
    }

    /**
     * 向所有连接的客户端广播消息
     */
    public void broadcastMessage(Object message) {
        String jsonMessage = JSON.toJSONString(message);
        for (WebSocketSession session : sessions) {
            if (session.isOpen()) {
                try {
                    session.sendMessage(new TextMessage(jsonMessage));
                } catch (IOException e) {
                    logger.error("广播WebSocket消息失败，会话ID: {}", session.getId(), e);
                    sessions.remove(session);
                }
            }
        }
        logger.info("广播WebSocket消息: {}", jsonMessage);
    }

    /**
     * 获取当前连接数
     */
    public int getConnectionCount() {
        return sessions.size();
    }

    /**
     * 获取指定用户的连接状态
     */
    public boolean isUserConnected(String userId) {
        WebSocketSession session = userSessions.get(userId);
        return session != null && session.isOpen();
    }
} 