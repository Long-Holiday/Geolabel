package com.example.labelMark.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.labelMark.domain.TeamTable;
import com.example.labelMark.mapper.TeamTableMapper;
import com.example.labelMark.service.SysUserService;
import com.example.labelMark.service.TeamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Random;

/**
 * <p>
 * 团队服务实现类
 * </p>
 *
 * 
 * @since 2025-05-17
 */
@Service
public class TeamServiceImpl extends ServiceImpl<TeamTableMapper, TeamTable> implements TeamService {

    @Autowired
    private TeamTableMapper teamTableMapper;

    @Autowired
    private SysUserService sysUserService;

    /**
     * 创建团队
     *
     * @param teamName 团队名称
     * @param adminId  管理员ID
     * @return 团队对象
     */
    @Override
    @Transactional
    public TeamTable createTeam(String teamName, Integer adminId) {
        // 检查管理员是否已经加入团队
        TeamTable existingTeam = null;
        // 获取用户信息
        var user = sysUserService.findByUserId(adminId);
        if (user != null && user.getTeamId() != null) {
            existingTeam = getById(user.getTeamId());
            if (existingTeam != null) {
                return existingTeam; // 管理员已加入团队，返回已有团队
            }
        }

        // 生成唯一团队码
        String teamCode = generateUniqueTeamCode();

        // 创建新团队
        TeamTable teamTable = new TeamTable();
        teamTable.setName(teamName);
        teamTable.setCode(teamCode);
        // 不再设置admin_id字段
        save(teamTable);

        // 更新管理员的团队ID
        sysUserService.updateUserTeamId(adminId, teamTable.getTeamId());

        return teamTable;
    }

    /**
     * 获取管理员创建的团队码
     *
     * @param adminId 管理员ID
     * @return 团队码
     */
    @Override
    public String getTeamCodeByAdminId(Integer adminId) {
        // 获取用户信息
        var user = sysUserService.findByUserId(adminId);
        if (user != null && user.getTeamId() != null) {
            // 根据用户的团队ID获取团队信息
            TeamTable team = getById(user.getTeamId());
            return team != null ? team.getCode() : null;
        }
        return null;
    }

    /**
     * 生成唯一的团队码
     *
     * @return 6位数的团队码
     */
    @Override
    public String generateUniqueTeamCode() {
        Random random = new Random();
        String teamCode;
        boolean isUnique = false;

        do {
            // 生成6位数字码
            int code = 100000 + random.nextInt(900000);
            teamCode = String.valueOf(code);

            // 检查是否唯一
            QueryWrapper<TeamTable> queryWrapper = new QueryWrapper<>();
            queryWrapper.eq("code", teamCode);
            isUnique = count(queryWrapper) == 0;
        } while (!isUnique);

        return teamCode;
    }
    
    /**
     * 加入团队
     *
     * @param teamCode 团队码
     * @param userId 用户ID
     * @return 操作结果，成功返回团队对象，失败返回null
     */
    @Override
    @Transactional
    public TeamTable joinTeam(String teamCode, Integer userId) {
        // 根据团队码获取团队
        TeamTable teamTable = getTeamByCode(teamCode);
        
        // 如果团队不存在，返回null
        if (teamTable == null) {
            return null;
        }
        
        // 更新用户的团队ID
        boolean updateResult = sysUserService.updateUserTeamId(userId, teamTable.getTeamId());
        
        // 如果更新成功，返回团队对象
        return updateResult ? teamTable : null;
    }
    
    /**
     * 根据团队码获取团队
     *
     * @param teamCode 团队码
     * @return 团队对象
     */
    @Override
    public TeamTable getTeamByCode(String teamCode) {
        QueryWrapper<TeamTable> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("code", teamCode);
        return getOne(queryWrapper);
    }
} 