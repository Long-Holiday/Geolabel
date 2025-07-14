package com.example.labelMark.mapper;

import com.example.labelMark.domain.TaskAccepted;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Select;

/**
 * <p>
 *  Mapper 接口
 * </p>
 *
 * 
 * @since 2024-04-25
 */
@Mapper
public interface TaskAcceptedMapper extends BaseMapper<TaskAccepted> {

    @Delete("delete from task_accepted where task_id=#{id}")
    void deleteTaskAcceptByTaskId(int id);

//    @Options(useGeneratedKeys = true, keyProperty = "id", keyColumn = "id")
    TaskAccepted createTaskAccept(Integer taskId, String username, String typeArr);
    
    /**
     * 获取指定任务ID和用户名对应的类型数组
     *
     * @param taskId 任务ID
     * @param username 用户名
     * @return 类型数组字符串
     */
    @Select("SELECT type_arr FROM task_accepted WHERE task_id = #{taskId} AND username = #{username}")
    String getTypeArrByTaskIdAndUsername(int taskId, String username);
    
    /**
     * 删除除指定用户外的所有任务接受记录
     *
     * @param taskId 任务ID
     * @param userId 要保留的用户ID
     */
    @Delete("DELETE FROM task_accepted WHERE task_id = #{taskId} AND " +
            "(SELECT username FROM sys_user WHERE user_id = #{userId}) != username")
    void deleteOtherUsers(Integer taskId, Integer userId);
}
