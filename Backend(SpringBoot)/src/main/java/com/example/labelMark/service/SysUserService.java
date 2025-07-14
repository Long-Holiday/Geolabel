package com.example.labelMark.service;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.example.labelMark.domain.Role;
import com.example.labelMark.domain.SysUser;

import java.util.List;

/**
 * <p>
 * 服务类
 * </p>
 *
 * 
 * @since 2024-04-15
 */
public interface SysUserService extends IService<SysUser> {
    /**
     * 创建用户
     *
     * @param user
     * @return
     */
    int createUser(SysUser user);

    SysUser findByUsername(String username);

    SysUser findByUserId(Integer userId);

    boolean resetPassword(SysUser user);

    long getUsersCountByAdmin(int isAdmin);
    
    /**
     * 根据管理员状态和团队ID获取用户数量
     *
     * @param isAdmin 管理员状态
     * @param teamId 团队ID
     * @return 用户数量
     */
    long getUsersCountByAdminAndTeamId(int isAdmin, Integer teamId);

    long getTotalCount();

    /**
     * 获取用户分页列表
     *
     * @param current
     * @param pageSize
     * @param userid
     * @param username
     * @param isAdmin
     * @return
     */
    Page<SysUser> getUsersPage(Integer current, Integer pageSize, Integer userid, String username, Integer isAdmin);

    /**
     * 根据团队ID获取用户分页列表
     * 
     * @param current
     * @param pageSize
     * @param userid
     * @param username
     * @param isAdmin
     * @param teamId
     * @return
     */
    Page<SysUser> getUsersPageByTeamId(Integer current, Integer pageSize, Integer userid, String username, Integer isAdmin, Integer teamId);

    boolean updateUser(Integer userId, String username, Integer isAdmin);

    /**
     * 根据管理员ID获取其团队ID
     *
     * @param adminUserId 管理员用户ID
     * @return 团队ID
     */
    Integer getAdminTeamId(Integer adminUserId);

    /**
     * 获取指定团队下所有非管理员用户
     *
     * @param teamId 团队ID
     * @return 用户列表
     */
    List<SysUser> getUsersByTeamIdAndNotAdmin(Integer teamId);

    /**
     * 获取所有非指定团队且非管理员的用户
     *
     * @param adminTeamId 管理员所在团队ID
     * @return 用户列表
     */
    List<SysUser> getNonTeamUsersAndNotAdmin(Integer adminTeamId);
    
    /**
     * 获取所有非管理员用户
     *
     * @return 所有非管理员用户列表
     */
    List<SysUser> getAllNonAdminUsers();

    boolean deleteUserById(Integer userId);
    
    /**
     * 更新用户的团队ID
     *
     * @param userId 用户ID
     * @param teamId 团队ID
     * @return 更新是否成功
     */
    boolean updateUserTeamId(Integer userId, Integer teamId);

    /**
     * 更新用户积分
     *
     * @param userId 用户ID
     * @param score  新的积分值
     * @return 更新是否成功
     */
    boolean updateUserScore(Integer userId, Integer score);

    /**
     * 增加用户积分
     *
     * @param userId 用户ID
     * @param score 积分
     * @return 更新是否成功
     */
    boolean addUserScore(Integer userId, Integer score);

    /**
     * 扣除用户积分
     *
     * @param userId 用户ID
     * @param score 积分
     * @return 更新是否成功
     */
    boolean subtractUserScore(Integer userId, Integer score);
}
