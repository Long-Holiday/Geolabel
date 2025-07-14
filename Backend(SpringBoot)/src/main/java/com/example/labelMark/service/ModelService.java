package com.example.labelMark.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.example.labelMark.domain.Model;

import java.util.List;
import java.util.Map;

/**
 * <p>
 * 模型表 服务类
 * </p>
 *
 * 
 * @since 2024-07-26
 */
public interface ModelService extends IService<Model> {

    /**
     * 根据用户ID及任务类型获取对应模型列表，并格式化为 Map
     *
     * @param userId   用户ID taskType 任务类型
     * @param taskType
     * @return Map<String, String> (model_name -> describe)
     */
    Map<String, String> getModelMapByUserId(Integer userId, String taskType);

    /**
     * 根据用户ID获取所有模型列表，并格式化为 Map（不过滤任务类型）
     *
     * @param userId   用户ID
     * @return Map<String, String> (model_name -> describe)
     */
    Map<String, String> getModelMapByUserId(Integer userId);

    /**
     * 根据用户ID获取原始模型列表
     * @param userId 用户ID
     * @return List<Model>
     */
    List<Model> getModelListByUserId(Integer userId, String taskType);

    /**
     * 根据用户ID获取所有模型列表（不过滤任务类型）
     * @param userId 用户ID
     * @return List<Model>
     */
    List<Model> getModelListByUserIdWithoutTaskType(Integer userId);


    /**
     * 保存模型
     * @param model 模型对象
     * @return 是否保存成功
     */
    boolean saveModel(Model model);

    /**
     * 更新模型
     * @param model 模型对象
     * @return 是否更新成功
     */
    boolean updateModel(Model model);

    /**
     * 删除模型
     * @param modelId 模型ID
     * @return 是否删除成功
     */
    boolean deleteModel(Integer modelId);
}