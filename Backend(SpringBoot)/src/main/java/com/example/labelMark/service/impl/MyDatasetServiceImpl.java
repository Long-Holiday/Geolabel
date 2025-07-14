package com.example.labelMark.service.impl;

import com.example.labelMark.domain.MyDataset;
import com.example.labelMark.mapper.MyDatasetMapper;
import com.example.labelMark.service.MyDatasetService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.util.List;
import java.util.Map;

/**
 * <p>
 * 用户已兑换数据集服务实现类
 * </p>
 *
 * 
 * @since 2024-05-08
 */
@Service
public class MyDatasetServiceImpl extends ServiceImpl<MyDatasetMapper, MyDataset> implements MyDatasetService {

    @Resource
    private MyDatasetMapper myDatasetMapper;

    @Override
    @Transactional
    public Boolean exchangeDataset(Integer userId, Integer datasetId) {
        try {
            System.out.println("开始兑换数据集，用户ID: " + userId + ", 数据集ID: " + datasetId);
            
            // 检查是否已经兑换过
            Integer count = myDatasetMapper.checkUserHasDataset(userId, datasetId);
            if (count > 0) {
                System.out.println("用户已经兑换过该数据集");
                return false; // 已经兑换过
            }
            
            // 创建兑换记录
            MyDataset myDataset = new MyDataset();
            myDataset.setUserId(userId);
            myDataset.setDatasetId(datasetId);
            
            System.out.println("准备插入兑换记录: userId=" + userId + ", datasetId=" + datasetId);
            myDatasetMapper.addMyDataset(myDataset);
            
            // 检查插入是否成功（通过检查生成的ID）
            if (myDataset.getId() != null && myDataset.getId() > 0) {
                System.out.println("兑换记录插入成功，生成的ID: " + myDataset.getId());
                return true;
            } else {
                System.out.println("兑换记录插入失败，未生成有效ID");
                return false;
            }
            
        } catch (Exception e) {
            System.out.println("兑换数据集时发生异常: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }

    @Override
    public List<Map<String, Object>> findMyDatasetsByUserId(Integer userId) {
        return myDatasetMapper.findMyDatasetsByUserId(userId);
    }

    @Override
    public Boolean checkUserHasDataset(Integer userId, Integer datasetId) {
        Integer count = myDatasetMapper.checkUserHasDataset(userId, datasetId);
        return count > 0;
    }
} 