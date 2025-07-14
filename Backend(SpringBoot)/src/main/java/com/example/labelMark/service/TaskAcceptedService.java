package com.example.labelMark.service;

import com.example.labelMark.domain.TaskAccepted;
import com.baomidou.mybatisplus.extension.service.IService;

import java.util.List;

/**
 * <p>
 *  服务类
 * </p>
 *
 * 
 * @since 2024-05-08
 */
public interface TaskAcceptedService extends IService<TaskAccepted> {

    boolean createTaskAccept(Integer taskId, String username, String typeArr);

    void deleteTaskAcceptByTaskId(int id);
    
    /**
     * 获取指定任务ID和用户名对应的类型数组
     *
     * @param taskId 任务ID
     * @param username 用户名
     * @return 类型数组字符串
     */
    String getTypeArrByTaskIdAndUsername(int taskId, String username);
    
    /**
     * 删除除指定用户外的所有任务接受记录
     *
     * @param taskId 任务ID
     * @param userId 要保留的用户ID
     */
    void deleteOtherUsers(Integer taskId, Integer userId);
}
