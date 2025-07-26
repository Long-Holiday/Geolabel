package com.example.labelMark.config;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import com.example.labelMark.service.TypeService;
import com.example.labelMark.utils.CovertCoordinateToPixel;

@Configuration
public class AppConfig {

    @Autowired
    public void configureCovertCoordinateToPixel(TypeService typeService) {
        CovertCoordinateToPixel.setTypeService(typeService);
    }
}
