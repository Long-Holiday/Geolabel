package com.example.labelMark.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.example.labelMark.domain.Mark;
import com.example.labelMark.mapper.MarkMapper;
import com.example.labelMark.service.MarkService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.sql.ResultSet;
import java.util.List;

/**
 * <p>
 *  服务实现类
 * </p>
 *
 * 
 * @since 2024-04-28
 */
@Service
public class MarkServiceImpl extends ServiceImpl<MarkMapper, Mark> implements MarkService {

    @Resource
    private MarkMapper markMapper;

    @Override
    public boolean isMark(int taskId, int userId) {
        int count = markMapper.isMark(taskId, userId);
        if(count != 0){
            return true;
        }else {
            return false;
        }
    }

    @Override
    public void createMark(int taskId, int userId, int typeId, com.alibaba.fastjson.JSONObject geom) {
        Mark mark = new Mark();
        mark.setTaskId(taskId);
        mark.setUserId(userId);
        mark.setTypeId(typeId);
        mark.setGeom(geom);
        mark.setStatus(0);
        save(mark);
    }

    @Override
    public void deleteMark(int taskId, int userId,int typeId) {
        markMapper.deleteMark(taskId, userId, typeId);
    }

    @Override
    public void insertOrUpdateMark(Mark mark) {
        saveOrUpdate(mark);
    }

    @Override
    public void deleteMarkByTaskId(int taskId) {
        markMapper.deleteMarkByTaskId(taskId);
    }

    @Override
    public long GetTaskIdNum(int taskId) {
//        Integer num = markMapper.GetTaskIdNum(taskId);
        QueryWrapper<Mark> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("task_id", taskId);
        long count = count(queryWrapper);
        return count;
    }

    @Override
    public List<Mark> selectMarkById(int taskId) {
        List<Mark> marks = markMapper.selectMarkById(taskId);
        return marks;
    }

    @Override
    public List<Mark> getMarkByTaskId(Integer taskId) {
        QueryWrapper<Mark> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("task_id", taskId);
        return list(queryWrapper);
    }
    @Override
    public List<Mark> getTotal() {
        return list();
    }
    @Override
    public Mark selectByMarkId(Integer markId) {
        return getById(markId);
    }

    @Override
    public boolean deleteMarks(List<Mark> total) {
        for (Mark mark:total){
            int i = markMapper.deleteById(mark);
            if (i<=0){
                return false;
            }
        }
        return true;
    }

    @Override
    public void deleteMarkByTaskAndUser(int taskId, int userId) {
        markMapper.deleteMarkByTaskAndUserId(taskId, userId);
    }

}
