package com.example.labelMark.service;

import com.example.labelMark.domain.MyDataset;
import com.baomidou.mybatisplus.extension.service.IService;

import java.util.List;
import java.util.Map;

/**
 * <p>
 * 用户已兑换数据集服务类
 * </p>
 *
 * 
 * @since 2024-05-08
 */
public interface MyDatasetService extends IService<MyDataset> {

    /**
     * 用户兑换数据集
     * 
     * @param userId 用户ID
     * @param datasetId 数据集ID
     * @return 是否成功
     */
    Boolean exchangeDataset(Integer userId, Integer datasetId);
    
    /**
     * 根据用户ID查询已兑换的数据集
     * 
     * @param userId 用户ID
     * @return 数据集列表
     */
    List<Map<String, Object>> findMyDatasetsByUserId(Integer userId);
    
    /**
     * 检查用户是否已兑换某个数据集
     * 
     * @param userId 用户ID
     * @param datasetId 数据集ID
     * @return 是否已兑换
     */
    Boolean checkUserHasDataset(Integer userId, Integer datasetId);
} 