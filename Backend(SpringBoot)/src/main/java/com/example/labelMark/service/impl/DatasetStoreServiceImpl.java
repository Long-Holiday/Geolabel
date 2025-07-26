package com.example.labelMark.service.impl;

import com.example.labelMark.domain.DatasetStore;
import com.example.labelMark.domain.ImageInfo;
import com.example.labelMark.domain.SampleImg;
import com.example.labelMark.mapper.DatasetStoreMapper;
import com.example.labelMark.mapper.SampleImgMapper;
import com.example.labelMark.service.DatasetStoreService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.List;
import java.util.Map;

/**
 * <p>
 *  服务实现类
 * </p>
 *
 * 
 * @since 2024-05-08
 */
@Service
public class DatasetStoreServiceImpl extends ServiceImpl<DatasetStoreMapper, DatasetStore> implements DatasetStoreService {

    @Resource
    private DatasetStoreMapper datasetStoreMapper;

    @Resource
    private SampleImgMapper sampleImgMapper;

    @Override
    public Integer createDataset(int taskId, int userId) {
        DatasetStore datasetStore = new DatasetStore();
        datasetStore.setTaskId(taskId);
        datasetStore.setIsPublic(0);
        datasetStore.setUserId(userId);
        datasetStoreMapper.createDataset(datasetStore);
        int sampleId = datasetStore.getSampleId();
        return sampleId;
    }
    
    @Override
    public Integer createDatasetWithName(int taskId, int userId, String sampleName) {
        DatasetStore datasetStore = new DatasetStore();
        datasetStore.setTaskId(taskId);
        datasetStore.setIsPublic(0);
        datasetStore.setUserId(userId);
        datasetStore.setSampleName(sampleName);
        datasetStoreMapper.createDatasetWithName(datasetStore);
        int sampleId = datasetStore.getSampleId();
        return sampleId;
    }

    @Override
    public List<Map<String, Object>> findDatasetByTaskId(int taskId) {
        List<Map<String, Object>> taskDatasetInfos = datasetStoreMapper.findDatasetByTaskId(taskId);
        return taskDatasetInfos;
    }

    @Override
    public List<Map<String, Object>> findDatasetByUserIdAndPublic(int userId) {
        List<Map<String, Object>> taskDatasetInfos = datasetStoreMapper.findDatasetByUserIdAndPublic(userId);
        return taskDatasetInfos;
    }
    
    @Override
    public List<Map<String, Object>> findDatasetByUserIdAndSampleName(int userId, String sampleName) {
        List<Map<String, Object>> taskDatasetInfos = datasetStoreMapper.findDatasetByUserIdAndSampleName(userId, sampleName);
        return taskDatasetInfos;
    }

    @Override
    public void updateDatasetStatusBySampleId(int isPublic, int sampleId) {
        datasetStoreMapper.updateDatasetStatusBySampleId(isPublic, sampleId);
    }

    @Override
    public void updateDatasetPUrlBySampleId(String pUrl, int sampleId) {
        datasetStoreMapper.updateDatasetPUrlBySampleId(pUrl, sampleId);
    }

    @Override
    public void insertSampleImgInfo(int sampleId, int typeId, String imgSrc) {
        SampleImg sampleImg = new SampleImg();
        sampleImg.setSampleId(sampleId);
        sampleImg.setTypeId(typeId);
        sampleImg.setImgSrc(imgSrc);
        sampleImgMapper.insert(sampleImg);
    }

    @Override
    public void deleteDatastoreById(int sampleId) {
        datasetStoreMapper.deleteById(sampleId);
    }

    @Override
    public int getTotalImgNumBySampleId(Integer sampleId) {
        int num = datasetStoreMapper.getTotalImgNumBySampleId(sampleId);
        return num;
    }

    @Override
    public List<ImageInfo> findImgSrcTypeNameBySampleId(Integer sampleId, int pageSize, int current) {
        List<ImageInfo> imageInfo = datasetStoreMapper.findImgSrcTypeNameBySampleId(sampleId, pageSize, current);
        return imageInfo;
    }

    @Override
    public Integer hasGenerateDataset(int taskId) {
        Integer res = datasetStoreMapper.hasGenerateDataset(taskId);
        return res;
    }
}
