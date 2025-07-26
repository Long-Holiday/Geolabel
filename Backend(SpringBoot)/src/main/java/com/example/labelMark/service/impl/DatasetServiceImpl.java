package com.example.labelMark.service.impl;

import com.example.labelMark.domain.Dataset;
import com.example.labelMark.domain.DatasetStore;
import com.example.labelMark.domain.SampleImg;
import com.example.labelMark.domain.Task;
import com.example.labelMark.mapper.DatasetMapper;
import com.example.labelMark.mapper.DatasetStoreMapper;
import com.example.labelMark.mapper.SampleImgMapper;
import com.example.labelMark.mapper.TaskMapper;
import com.example.labelMark.service.DatasetService;
import com.example.labelMark.service.DatasetStoreService;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.*;
import java.util.stream.Collectors;

/**
 * <p>
 * 数据集服务实现类
 * </p>
 *
 * 
 * @since 2024-05-08
 */
@Service
public class DatasetServiceImpl extends ServiceImpl<DatasetMapper, Dataset> implements DatasetService {

    @Resource
    private DatasetMapper datasetMapper;
    
    @Resource
    private DatasetStoreMapper datasetStoreMapper;
    
    @Resource
    private TaskMapper taskMapper;
    
    @Resource
    private SampleImgMapper sampleImgMapper;
    
    @Resource
    private DatasetStoreService datasetStoreService;

    @Override
    public Integer createDataset(Dataset dataset) {
        datasetMapper.createDataset(dataset);
        return dataset.getDatasetId();
    }

    @Override
    public List<Dataset> findDatasetBySampleId(String sampleId) {
        return datasetMapper.findDatasetBySampleId(sampleId);
    }

    @Override
    public List<Dataset> findDatasetByUserId(int userId) {
        return datasetMapper.findDatasetByUserId(userId);
    }

    @Override
    public Integer publishSharedDataset(List<String> sampleIds, String name, String setDess, String cont, String email, Integer goal) {
        if (sampleIds == null || sampleIds.isEmpty()) {
            return null;
        }
        
        // 将样本ID列表转换为整数列表
        List<Integer> sampleIdInts = sampleIds.stream()
                .map(Integer::parseInt)
                .collect(Collectors.toList());
        
        // 获取第一条记录的任务信息
        DatasetStore firstDatasetStore = datasetStoreMapper.selectById(sampleIdInts.get(0));
        if (firstDatasetStore == null) {
            return null;
        }
        
        // 获取任务信息
        Task task = taskMapper.selectById(firstDatasetStore.getTaskId());
        if (task == null) {
            return null;
        }
        
        // 计算样本数量
        int totalSamples = 0;
        for (Integer sampleId : sampleIdInts) {
            int count = datasetStoreService.getTotalImgNumBySampleId(sampleId);
            totalSamples += count;
        }
        
        // 获取所有样本的类别
        Set<String> typeNames = new HashSet<>();
        for (Integer sampleId : sampleIdInts) {
            List<Map<String, Object>> types = sampleImgMapper.findTypeNamesBySampleId(sampleId);
            for (Map<String, Object> type : types) {
                String typeName = (String) type.get("type_name");
                if (typeName != null) {
                    typeNames.add(typeName);
                }
            }
        }
        
        // 获取多个样本的图像作为缩略图，用逗号分隔
        List<String> thumbUrls = new ArrayList<>();
        for (Integer sampleId : sampleIdInts) {
            List<SampleImg> sampleImgs = sampleImgMapper.findImgSrcBySampleId(sampleId, 1, 0);
            if (!sampleImgs.isEmpty()) {
                // 获取对应的任务ID
                DatasetStore datasetStore = datasetStoreMapper.selectById(sampleId);
                if (datasetStore != null) {
                    String imgSrc = sampleImgs.get(0).getImgSrc();
                    String thumbPath;
                    
                    System.out.println("原始imgSrc: " + imgSrc);
                    System.out.println("taskId: " + datasetStore.getTaskId());
                    
                    // 检查imgSrc是否已经是完整路径
                    if (imgSrc.startsWith("/home/change/labelcode/")) {
                        // 如果已经是完整路径，直接使用
                        thumbPath = imgSrc;
                        System.out.println("使用完整路径: " + thumbPath);
                    } else {
                        // 如果是相对路径或文件名，构建完整路径
                        // 提取文件名（去掉可能的路径前缀）
                        String fileName = imgSrc;
                        if (imgSrc.contains("/")) {
                            fileName = imgSrc.substring(imgSrc.lastIndexOf("/") + 1);
                        }
                        thumbPath = "/home/change/labelcode/labelMark/src/main/java/com/example/labelMark/resource/public/dataset_temp/mark_" + 
                                   datasetStore.getTaskId() + "/mark_" + datasetStore.getTaskId() + "_" + fileName;
                        System.out.println("构建路径: " + thumbPath);
                    }
                    thumbUrls.add(thumbPath);
                }
            }
        }
        String thumbUrl = String.join(",", thumbUrls);
        
        // 创建数据集对象
        Dataset dataset = new Dataset();
        dataset.setName(name);
        dataset.setSetDess(setDess);
        dataset.setThumbUrl(thumbUrl);
        dataset.setNum(totalSamples);
        dataset.setCont(cont);
        dataset.setEmail(email);
        dataset.setSorts(String.join(",", typeNames));
        dataset.setUserId(task.getUserId());
        dataset.setTaskType(task.getTaskType());
        dataset.setSampleId(String.join(",", sampleIds));
        dataset.setGoal(goal);
        
        // 创建数据集
        datasetMapper.createDataset(dataset);
        
        // 更新所有样本为公开状态
        for (Integer sampleId : sampleIdInts) {
            datasetStoreService.updateDatasetStatusBySampleId(1, sampleId);
        }
        
        return dataset.getDatasetId();
    }
    
    @Override
    public List<Dataset> findAllDatasets() {
        return datasetMapper.findAllDatasets();
    }

    @Override
    public Dataset findDatasetByContainedSampleStoreId(Integer sampleStoreId) {
        if (sampleStoreId == null) {
            return null;
        }
        String idStr = String.valueOf(sampleStoreId);
        QueryWrapper<Dataset> queryWrapper = new QueryWrapper<>();
        // 精确匹配单个ID或ID在逗号分隔列表中的情况
        queryWrapper.and(wrapper -> wrapper
                .eq("sample_id", idStr) // 完全匹配单个ID
                .or().like("sample_id", idStr + ",%") // ID在列表开头
                .or().like("sample_id", "%," + idStr + ",%") // ID在列表中间
                .or().like("sample_id", "%," + idStr) // ID在列表末尾
        );
        List<Dataset> datasets = list(queryWrapper);
        if (datasets != null && !datasets.isEmpty()) {
            // 如果有多个匹配（理论上不应该，除非sample_id字符串格式允许重复或设计有缺陷），返回第一个
            // 或者可以根据业务逻辑选择更合适的处理方式，例如抛出异常或记录警告
            return datasets.get(0); 
        }
        return null;
    }
} 