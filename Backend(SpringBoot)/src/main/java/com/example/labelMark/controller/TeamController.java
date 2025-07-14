package com.example.labelMark.controller;

import com.example.labelMark.domain.TeamTable;
import com.example.labelMark.service.TeamService;
import com.example.labelMark.utils.ResultGenerator;
import com.example.labelMark.vo.LoginUser;
import com.example.labelMark.vo.constant.Result;
import com.example.labelMark.vo.constant.StatusEnum;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * <p>
 * 团队业务控制器
 * </p>
 *
 */
@RestController
@RequestMapping("/team")
@Api(tags = "团队业务控制器")
public class TeamController {

    @Autowired
    private TeamService teamService;

    /**
     * 创建团队
     *
     * @param params 请求参数，包含团队名称
     * @return 创建结果
     */
    @ApiOperation("创建团队")
    @PostMapping("/create")
    public Result createTeam(@RequestBody Map<String, Object> params) {
        try {
            // 从请求参数中获取团队名称
            String teamName = (String) params.get("teamName");
            if (teamName == null || teamName.trim().isEmpty()) {
                return ResultGenerator.getFailResult("团队名称不能为空");
            }

            // 从Spring Security上下文中获取当前登录的管理员用户ID
            LoginUser loginUser = (LoginUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            Integer adminId = loginUser.getSysUser().getUserid();

            // 调用服务创建团队
            TeamTable team = teamService.createTeam(teamName, adminId);

            // 创建返回数据
            Map<String, Object> data = new HashMap<>();
            data.put("teamId", team.getTeamId());
            data.put("teamName", team.getName());
            data.put("teamCode", team.getCode());

            return ResultGenerator.getSuccessResult(data);
        } catch (Exception e) {
            return ResultGenerator.getFailResult("团队创建失败：" + e.getMessage());
        }
    }

    /**
     * 获取当前管理员的团队码
     *
     * @return 团队码
     */
    @ApiOperation("获取当前管理员的团队码")
    @GetMapping("/getMyTeamCode")
    public Result getMyTeamCode() {
        try {
            // 从Spring Security上下文中获取当前登录的管理员用户ID
            LoginUser loginUser = (LoginUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            Integer adminId = loginUser.getSysUser().getUserid();

            // 获取团队码
            String teamCode = teamService.getTeamCodeByAdminId(adminId);

            if (teamCode == null) {
                return ResultGenerator.getFailResult("未创建团队");
            }

            Map<String, Object> data = new HashMap<>();
            data.put("teamCode", teamCode);
            return ResultGenerator.getSuccessResult(data);
        } catch (Exception e) {
            return ResultGenerator.getFailResult("获取团队码失败：" + e.getMessage());
        }
    }
    
    /**
     * 加入团队
     *
     * @param params 请求参数，包含团队码
     * @return 加入结果
     */
    @ApiOperation("加入团队")
    @PostMapping("/join")
    public Result joinTeam(@RequestBody Map<String, Object> params) {
        try {
            // 从请求参数中获取团队码
            String teamCode = (String) params.get("teamCode");
            if (teamCode == null || teamCode.trim().isEmpty()) {
                return ResultGenerator.getFailResult("团队码不能为空");
            }

            // 从Spring Security上下文中获取当前登录的用户ID
            LoginUser loginUser = (LoginUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            Integer userId = loginUser.getSysUser().getUserid();

            // 调用服务加入团队
            TeamTable team = teamService.joinTeam(teamCode, userId);

            if (team == null) {
                return ResultGenerator.getFailResult("加入团队失败：团队码无效或操作异常");
            }

            // 创建返回数据
            Map<String, Object> data = new HashMap<>();
            data.put("teamId", team.getTeamId());
            data.put("teamName", team.getName());

            return ResultGenerator.getSuccessResult(data);
        } catch (Exception e) {
            return ResultGenerator.getFailResult("加入团队失败：" + e.getMessage());
        }
    }
} 