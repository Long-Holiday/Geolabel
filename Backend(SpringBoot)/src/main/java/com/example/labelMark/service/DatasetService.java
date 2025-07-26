package com.example.labelMark.service;

import com.example.labelMark.domain.Dataset;
import com.baomidou.mybatisplus.extension.service.IService;

import java.util.List;
import java.util.Map;

/**
 * <p>
 * 数据集服务类
 * </p>
 *
 * 
 * @since 2024-05-08
 */
public interface DatasetService extends IService<Dataset> {

    /**
     * 创建共享数据集
     * 
     * @param dataset 数据集对象
     * @return 数据集ID
     */
    Integer createDataset(Dataset dataset);
    
    /**
     * 根据样本ID查询数据集
     * 
     * @param sampleId 样本ID
     * @return 数据集列表
     */
    List<Dataset> findDatasetBySampleId(String sampleId);
    
    /**
     * 根据用户ID查询数据集
     * 
     * @param userId 用户ID
     * @return 数据集列表
     */
    List<Dataset> findDatasetByUserId(int userId);
    
    /**
     * 发布共享数据集
     * 
     * @param sampleIds 样本ID列表
     * @param name 数据集名称
     * @param setDess 数据集描述
     * @param cont 联系人
     * @param email 联系邮箱
     * @param goal 下载所需积分
     * @return 数据集ID
     */
    Integer publishSharedDataset(List<String> sampleIds, String name, String setDess, String cont, String email, Integer goal);
    
    /**
     * 查询所有数据集
     * 
     * @return 数据集列表
     */
    List<Dataset> findAllDatasets();

    Dataset findDatasetByContainedSampleStoreId(Integer sampleStoreId);
} 