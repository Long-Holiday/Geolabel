package com.example.labelMark.service;

import com.example.labelMark.domain.DatasetStore;
import com.baomidou.mybatisplus.extension.service.IService;
import com.example.labelMark.domain.ImageInfo;

import java.util.List;
import java.util.Map;

/**
 * <p>
 *  服务类
 * </p>

 */
public interface DatasetStoreService extends IService<DatasetStore> {

    Integer createDataset(int taskId, int userId);
    
    /**
     * 创建数据集，并设置样本名称
     * 
     * @param taskId 任务ID
     * @param userId 用户ID
     * @param sampleName 样本名称
     * @return 样本ID
     */
    Integer createDatasetWithName(int taskId, int userId, String sampleName);

    List<Map<String, Object>> findDatasetByTaskId(int taskId);
    
    List<Map<String, Object>> findDatasetByUserIdAndPublic(int userId);
    
    /**
     * 根据用户ID和样本名称查询数据集
     * 
     * @param userId 用户ID
     * @param sampleName 样本名称
     * @return 数据集列表
     */
    List<Map<String, Object>> findDatasetByUserIdAndSampleName(int userId, String sampleName);

    void updateDatasetStatusBySampleId(int isPublic, int sampleId);

    /**
     * 更新数据集的图像地址
     * 
     * @param pUrl 图像地址
     * @param sampleId 样本ID
     */
    void updateDatasetPUrlBySampleId(String pUrl, int sampleId);

    void insertSampleImgInfo(int sampleId, int typeId, String imgSrc);

    void deleteDatastoreById(int sampleId);

    int getTotalImgNumBySampleId(Integer sampleId);

    List<ImageInfo> findImgSrcTypeNameBySampleId(Integer sampleId, int pageSize, int current);

    Integer hasGenerateDataset(int taskId);
}
