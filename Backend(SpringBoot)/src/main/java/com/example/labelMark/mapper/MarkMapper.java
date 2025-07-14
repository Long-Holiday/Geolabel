package com.example.labelMark.mapper;

import com.example.labelMark.domain.Mark;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.*;
import com.alibaba.fastjson.JSONObject;
import com.example.labelMark.config.JsonObjectTypeHandler;

import java.util.List;

/**
 * <p>
 *  Mapper 接口
 * </p>
 *
 * 
 * @since 2024-04-28
 */
@Mapper
public interface MarkMapper extends BaseMapper<Mark> {

    @Delete("DELETE FROM mark WHERE task_id=#{taskId} AND user_id=#{userId} AND type_id=#{typeId} ")
    void deleteMark(int taskId, int userId, int typeId);

    @Insert("INSERT INTO mark(task_id, user_id, type_id, geom) values (#{taskId}, #{userId}, #{typeId}, #{geom, typeHandler=com.example.labelMark.config.JsonObjectTypeHandler, jdbcType=OTHER})")
    Mark createMark(int taskId, int userId, int typeId, @Param("geom") JSONObject geom);

    @Select("SELECT COUNT(*) FROM mark WHERE task_id=#{taskId} AND user_id=#{userId}")
    int isMark(int taskId, int userId);

    @Insert("INSERT INTO mark values (#{mark})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insertMark(Mark mark);

    @Delete("DELETE FROM mark WHERE task_id=#{taskId}")
    void deleteMarkByTaskId(int taskId);

    @Select("SELECT COUNT(*) FROM mark WHERE task_id=#{taskId}")
    Integer GetTaskIdNum(int taskId);

    @Select("SELECT * FROM mark WHERE task_id=#{taskId}")
    List<Mark> selectMarkById(int taskId);

    //根据 taskId 和 userId 删除标记
    @Delete("DELETE FROM mark WHERE task_id=#{taskId} AND user_id=#{userId}")
    void deleteMarkByTaskAndUserId(@Param("taskId") int taskId, @Param("userId") int userId);

//    @Insert()
//    void createMark(String markName);
}
