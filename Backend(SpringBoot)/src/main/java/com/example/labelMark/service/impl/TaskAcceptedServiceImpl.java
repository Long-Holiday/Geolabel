package com.example.labelMark.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.example.labelMark.domain.TaskAccepted;
import com.example.labelMark.mapper.TaskAcceptedMapper;
import com.example.labelMark.service.TaskAcceptedService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;

/**
 * <p>
 * 服务实现类
 * </p>
 *
 * 
 * @since 2024-04-25
 */
@Service
public class TaskAcceptedServiceImpl extends ServiceImpl<TaskAcceptedMapper, TaskAccepted> implements TaskAcceptedService {

    @Resource
    private TaskAcceptedMapper taskAcceptedMapper;

    @Override
    public boolean createTaskAccept(Integer taskId, String username, String typeArr) {
        TaskAccepted taskAccepted = new TaskAccepted();
        taskAccepted.setTaskId(taskId);
        taskAccepted.setUsername(username);
        taskAccepted.setTypeArr(typeArr);
        UpdateWrapper<TaskAccepted> wrapper=new UpdateWrapper<>();
        wrapper.eq("task_id",taskId).eq("username",username);
        boolean isSave = saveOrUpdate(taskAccepted,wrapper);
        return isSave;
    }

    @Override
    public void deleteTaskAcceptByTaskId(int id) {
        taskAcceptedMapper.deleteTaskAcceptByTaskId(id);
    }
    
    /**
     * 获取指定任务ID和用户名对应的类型数组
     *
     * @param taskId 任务ID
     * @param username 用户名
     * @return 类型数组字符串
     */
    @Override
    public String getTypeArrByTaskIdAndUsername(int taskId, String username) {
        QueryWrapper<TaskAccepted> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("task_id", taskId).eq("username", username);
        TaskAccepted taskAccepted = getOne(queryWrapper);
        return taskAccepted != null ? taskAccepted.getTypeArr() : null;
    }
    
    /**
     * 删除除指定用户外的所有任务接受记录
     *
     * @param taskId 任务ID
     * @param userId 要保留的用户ID
     */
    @Override
    public void deleteOtherUsers(Integer taskId, Integer userId) {
        taskAcceptedMapper.deleteOtherUsers(taskId, userId);
    }
}
