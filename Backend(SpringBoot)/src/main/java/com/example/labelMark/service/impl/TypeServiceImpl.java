package com.example.labelMark.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.labelMark.domain.Type;
import com.example.labelMark.service.TypeService;
import com.example.labelMark.mapper.TypeMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.List;

/**
* @description 针对表【type】的数据库操作Service实现
* @createDate 2024-04-13 19:46:27
*/
@Service
public class TypeServiceImpl extends ServiceImpl<TypeMapper, Type>
    implements TypeService{

    @Resource
    private TypeMapper typeMapper;
    @Override
    public List<Type> getTypes(Integer current, Integer pageSize, Integer typeId, String typeName) {
        int offset = pageSize * (current - 1);
        List<Type> types = typeMapper.getTypes(current,pageSize,typeId, typeName,offset );
        return types;
    }

    @Override
    public List<Integer> getId() {
        List<Integer> IDs = typeMapper.getId();
        return IDs;
    }

    @Override
    public void createType(Integer typeId, String typeName, String typeColor) {
        typeMapper.createType(typeId, typeName, typeColor);
    }

    @Override
    public void updateType(Type type) {
        typeMapper.updateType(type);
    }

    @Override
    public void deleteTypeById(Integer typeId) {
        typeMapper.deleteTypeById(typeId);
    }

    @Override
    public Type getTypeById(Integer typeId) {
        Type type = typeMapper.getTypeById(typeId);
        return type;
    }

    @Override
    public String getTypeNameById(Integer typeId) {
        String name = typeMapper.getTypeNameById(typeId);
        return name;
    }

    @Override
    public String getColorById(Integer typeId) {
        String typeColor = typeMapper.getColorById(typeId);
        return typeColor;
    }
}




