package com.example.labelMark.service;

import com.example.labelMark.domain.Task;
import com.baomidou.mybatisplus.extension.service.IService;
import com.example.labelMark.vo.TaskInfoDTO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * <p>
 *  服务类
 * </p>
 *
 * 
 * @since 2024-04-25
 */
public interface TaskService extends IService<Task> {

    int createTask(String dataRange, String taskName, String taskType,
                   String mapServer, Integer userId, Integer taskClass);

    List<TaskInfoDTO> getTaskInfo(String username);

    List<Integer> getIDs();

    void updateTaskById(int taskId, String taskName, String dateRange, String taskType, String mapServer);

    void deleteTaskById(int taskId);

    Task selectTaskById(int taskId);

    void updateTaskStatus(int taskId);

    void auditTask(int taskId, int status, String auditFeedback);

    int getTotalTasks();

    List<Map<String, Object>> findAllTask();

    List<Map<String, Object>> findPublicTask();

    List<Map<String, Object>> findTasksByUsername(String username);

    List<String> findUserListByTaskId(int taskId);

    void updateTask(int taskId, String markIdStr);

    String getServerById(int taskId);

    String getTypeById(int taskId);

    String getMarkIdById(int taskId);
    
    /**
     * 获取管理员创建的任务
     *
     * @param creatorUserId 创建者ID
     * @return 任务列表
     */
    List<TaskInfoDTO> getTasksByCreatorId(Integer creatorUserId);
    
    /**
     * 更新任务的submitter_id为指定用户ID
     *
     * @param taskId 任务ID
     * @param userId 用户ID
     */
    void updateTaskSubmitter(Integer taskId, Integer userId);
    
    /**
     * 更新任务的积分
     *
     * @param taskId 任务ID
     * @param score 积分
     */
    void updateTaskScore(Integer taskId, Integer score);
}
