package com.example.labelMark.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.labelMark.domain.Model;
import com.example.labelMark.mapper.ModelMapper;
import com.example.labelMark.service.ModelService;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * <p>
 * 模型表 服务实现类
 * </p>
 *
 * 
 * @since 2024-07-26
 */
@Service
public class ModelServiceImpl extends ServiceImpl<ModelMapper, Model> implements ModelService {

    @Resource
    private ModelMapper modelMapper;

    @Override
    public Map<String, String> getModelMapByUserId(Integer userId, String taskType) {
        List<Model> modelList = getModelListByUserId(userId, taskType);
        // 使用 Stream API 将 List<Model> 转换为 Map<String, String>
        return modelList.stream()
                .filter(model -> model.getModelName() != null && model.getModelDes() != null) // 修正为实际的 getter 方法名
                .collect(Collectors.toMap(Model::getModelName, Model::getModelDes, (existing, replacement) -> existing)); // 使用一致的 getter 方法
    }

    @Override
    public Map<String, String> getModelMapByUserId(Integer userId) {
        List<Model> modelList = getModelListByUserIdWithoutTaskType(userId);
        // 使用 Stream API 将 List<Model> 转换为 Map<String, String>
        return modelList.stream()
                .filter(model -> model.getModelName() != null && model.getModelDes() != null) // 修正为实际的 getter 方法名
                .collect(Collectors.toMap(Model::getModelName, Model::getModelDes, (existing, replacement) -> existing)); // 使用一致的 getter 方法
    }

    @Override
    public List<Model> getModelListByUserId(Integer userId, String taskType) {
        return modelMapper.selectByUserId(userId, taskType);
    }

    @Override
    public List<Model> getModelListByUserIdWithoutTaskType(Integer userId) {
        // 使用QueryWrapper查询所有属于该用户的模型，不过滤任务类型
        QueryWrapper<Model> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId);
        return list(queryWrapper);
    }


    @Override
    public boolean saveModel(Model model) {
        // 设置默认值
        if (model.getStatus() == null) {
            model.setStatus(1);
        }
        return save(model);
    }

    @Override
    public boolean updateModel(Model model) {
        return updateById(model);
    }

    @Override
    public boolean deleteModel(Integer modelId) {
        return removeById(modelId);
    }
}