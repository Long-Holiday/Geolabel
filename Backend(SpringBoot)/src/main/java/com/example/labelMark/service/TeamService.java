package com.example.labelMark.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.example.labelMark.domain.TeamTable;

/**
 * <p>
 * 团队服务 接口
 * </p>
 *
 * 
 * @since 2025-05-17
 */
public interface TeamService extends IService<TeamTable> {
    
    /**
     * 创建团队
     *
     * @param teamName 团队名称
     * @param adminId 管理员ID
     * @return 团队对象
     */
    TeamTable createTeam(String teamName, Integer adminId);
    
    /**
     * 获取管理员创建的团队码
     *
     * @param adminId 管理员ID
     * @return 团队码
     */
    String getTeamCodeByAdminId(Integer adminId);
    
    /**
     * 生成唯一的团队码
     *
     * @return 6位数的团队码
     */
    String generateUniqueTeamCode();
    
    /**
     * 加入团队
     *
     * @param teamCode 团队码
     * @param userId 用户ID
     * @return 操作结果，成功返回团队对象，失败返回null
     */
    TeamTable joinTeam(String teamCode, Integer userId);
    
    /**
     * 根据团队码获取团队
     *
     * @param teamCode 团队码
     * @return 团队对象
     */
    TeamTable getTeamByCode(String teamCode);
} 