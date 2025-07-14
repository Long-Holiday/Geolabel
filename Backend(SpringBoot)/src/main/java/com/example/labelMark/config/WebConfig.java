package com.example.labelMark.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web配置类
 * 用于配置静态资源访问和CORS
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 配置数据集临时目录的静态资源访问 - 使用绝对路径
        registry.addResourceHandler("/dataset_temp/**")
                .addResourceLocations("file:/home/change/labelcode/labelMark/src/main/java/com/example/labelMark/resource/public/dataset_temp/");
        
        // 配置数据集图像目录的静态资源访问
        registry.addResourceHandler("/dataset/**")
                .addResourceLocations("file:/home/change/labelcode/labelMark/src/main/java/com/example/labelMark/resource/public/dataset/");
        
        // 配置其他静态资源
        registry.addResourceHandler("/static/**")
                .addResourceLocations("classpath:/static/");
    }
    
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
} 