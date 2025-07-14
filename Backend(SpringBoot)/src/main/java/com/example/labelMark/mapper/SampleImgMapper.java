package com.example.labelMark.mapper;

import com.example.labelMark.domain.SampleImg;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.Map;

/**
 * <p>
 *  Mapper 接口
 * </p>
 *
 * 
 * @since 2024-05-09
 */
@Mapper
public interface SampleImgMapper extends BaseMapper<SampleImg> {

    /**
     * 根据样本ID查询类型名称
     * 
     * @param sampleId 样本ID
     * @return 类型名称列表
     */
    @Select("SELECT DISTINCT type.type_name FROM sample_img " +
            "JOIN type ON sample_img.type_id = type.type_id " +
            "WHERE sample_img.sample_id = #{sampleId}")
    List<Map<String, Object>> findTypeNamesBySampleId(@Param("sampleId") Integer sampleId);
    
    /**
     * 根据样本ID查询图片信息
     * 
     * @param sampleId 样本ID
     * @param pageSize 每页数量
     * @param offset 偏移量
     * @return 图片列表
     */
    @Select("SELECT * FROM sample_img " +
            "WHERE sample_id = #{sampleId} " +
            "LIMIT #{pageSize} OFFSET #{offset}")
    List<SampleImg> findImgSrcBySampleId(@Param("sampleId") Integer sampleId, 
                                        @Param("pageSize") int pageSize, 
                                        @Param("offset") int offset);
}
