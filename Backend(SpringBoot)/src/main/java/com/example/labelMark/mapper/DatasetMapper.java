package com.example.labelMark.mapper;

import com.example.labelMark.domain.Dataset;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.*;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Map;

/**
 * <p>
 * 数据集 Mapper 接口
 * </p>
 *
 * 
 * @since 2024-05-08
 */
@Mapper
public interface DatasetMapper extends BaseMapper<Dataset> {

    /**
     * 创建新的数据集记录
     * 
     * @param dataset 数据集对象
     */
    @Insert("INSERT INTO dataset (name, set_dess, thumb_url, num, cont, email, sorts, user_id, goal, task_type, sample_id) " +
            "VALUES (#{name}, #{setDess}, #{thumbUrl}, #{num}, #{cont}, #{email}, #{sorts}, #{userId}, #{goal}, #{taskType}, #{sampleId})")
    @Options(useGeneratedKeys = true, keyProperty = "datasetId")
    void createDataset(Dataset dataset);
    
    /**
     * 根据样本ID查询数据集
     * 
     * @param sampleId 样本ID
     * @return 数据集列表
     */
    @Select("SELECT * FROM dataset WHERE sample_id = #{sampleId}")
    List<Dataset> findDatasetBySampleId(@Param("sampleId") String sampleId);
    
    /**
     * 根据用户ID查询数据集
     * 
     * @param userId 用户ID
     * @return 数据集列表
     */
    @Select("SELECT * FROM dataset WHERE user_id = #{userId}")
    List<Dataset> findDatasetByUserId(@Param("userId") int userId);
    
    /**
     * 查询所有数据集
     * 
     * @return 数据集列表
     */
    @Select("SELECT * FROM dataset")
    List<Dataset> findAllDatasets();
} 