package com.example.labelMark.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/**
 * 任务队列配置类
 */
@Configuration
public class TaskQueueConfig {

    /**
     * 辅助功能任务队列
     */
    @Bean
    public BlockingQueue<Runnable> assistFunctionQueue() {
        return new LinkedBlockingQueue<>(100);
    }

    /**
     * 推理功能任务队列
     */
    @Bean
    public BlockingQueue<Runnable> inferenceFunctionQueue() {
        return new LinkedBlockingQueue<>(50);
    }

    /**
     * 辅助功能线程池
     */
    @Bean
    public ThreadPoolExecutor assistFunctionExecutor() {
        return new ThreadPoolExecutor(
                2,  // 核心线程数
                4,  // 最大线程数
                60, // 空闲线程存活时间
                TimeUnit.SECONDS,
                assistFunctionQueue(),
                new ThreadPoolExecutor.CallerRunsPolicy() // 拒绝策略：由调用者线程执行
        );
    }

    /**
     * 推理功能线程池
     */
    @Bean
    public ThreadPoolExecutor inferenceFunctionExecutor() {
        return new ThreadPoolExecutor(
                1,  // 核心线程数
                2,  // 最大线程数
                60, // 空闲线程存活时间
                TimeUnit.SECONDS,
                inferenceFunctionQueue(),
                new ThreadPoolExecutor.CallerRunsPolicy() // 拒绝策略：由调用者线程执行
        );
    }
} 