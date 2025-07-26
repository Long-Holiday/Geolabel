package com.example.labelMark.service;

import com.example.labelMark.domain.Type;
import com.baomidou.mybatisplus.extension.service.IService;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

/**
* @description 针对表【type】的数据库操作Service
* @createDate 2024-04-13 19:46:27
*/
public interface TypeService extends IService<Type> {

    List<Type> getTypes(Integer current, Integer pageSize, Integer typeId, String typeName);

    List<Integer> getId();

    void createType(Integer typeId, String typeName, String typeColor);

    void updateType(Type type);

    void deleteTypeById(Integer typeId);

    Type getTypeById(Integer typeId);

    String getTypeNameById(Integer typeId);

    String getColorById(Integer typeId);
}
