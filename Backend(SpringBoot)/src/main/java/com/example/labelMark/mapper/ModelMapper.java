package com.example.labelMark.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.labelMark.domain.Model;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * <p>
 * 模型表 Mapper 接口
 * </p>
 *
 * 
 * @since 2024-07-26
 */
@Mapper
public interface ModelMapper extends BaseMapper<Model> {

    /**
     * 根据用户ID查询模型列表
     * @param userId 用户ID
     * @return 模型列表
     */
    @Select("SELECT model_id, user_id, model_name, model_des FROM model WHERE user_id = #{userId} and task_type = #{taskType}")
    List<Model> selectByUserId(@Param("userId") Integer userId,@Param("taskType") String taskType);

}