package com.example.labelMark.mapper;

import com.example.labelMark.domain.MyDataset;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.*;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Map;

/**
 * <p>
 * 用户已兑换数据集 Mapper 接口
 * </p>
 *
 * 
 * @since 2024-05-08
 */
@Mapper
public interface MyDatasetMapper extends BaseMapper<MyDataset> {

    /**
     * 添加用户兑换的数据集记录
     * 
     * @param myDataset 兑换记录对象
     */
    @Insert("INSERT INTO mydataset (user_id, dataset_id) VALUES (#{userId}, #{datasetId})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void addMyDataset(MyDataset myDataset);
    
    /**
     * 根据用户ID查询已兑换的数据集
     * 
     * @param userId 用户ID
     * @return 数据集列表
     */
    @Select("SELECT d.* FROM dataset d " +
            "JOIN mydataset md ON d.dataset_id = md.dataset_id " +
            "WHERE md.user_id = #{userId}")
    List<Map<String, Object>> findMyDatasetsByUserId(@Param("userId") Integer userId);
    
    /**
     * 检查用户是否已兑换某个数据集
     * 
     * @param userId 用户ID
     * @param datasetId 数据集ID
     * @return 记录数量
     */
    @Select("SELECT COUNT(*) FROM mydataset WHERE user_id = #{userId} AND dataset_id = #{datasetId}")
    Integer checkUserHasDataset(@Param("userId") Integer userId, @Param("datasetId") Integer datasetId);
} 