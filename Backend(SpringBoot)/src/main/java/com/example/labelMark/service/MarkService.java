package com.example.labelMark.service;

import com.example.labelMark.domain.Mark;
import com.baomidou.mybatisplus.extension.service.IService;

import java.util.List;

/**
 * <p>
 *  服务类
 * </p>
 *
 * 
 * @since 2024-04-28
 */
public interface MarkService extends IService<Mark> {

    boolean isMark(int taskId, int userId);

    void createMark(int taskId, int userId, int typeId, com.alibaba.fastjson.JSONObject geom);

    void deleteMark(int taskId, int userId, int typeId);

    void insertOrUpdateMark(Mark mark);

    List<Mark> getMarkByTaskId(Integer taskId);

    void deleteMarkByTaskId(int taskId);

    List<Mark> selectMarkById(int taskId);

    long GetTaskIdNum(int taskId);

    List<Mark> getTotal();

    Mark selectByMarkId(Integer markId);
    boolean deleteMarks(List<Mark> total);

    void deleteMarkByTaskAndUser(int taskId, int userId);
}
