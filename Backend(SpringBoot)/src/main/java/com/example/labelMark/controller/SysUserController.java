package com.example.labelMark.controller;

import cn.hutool.core.util.ObjectUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.http.HttpRequest;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.labelMark.domain.Role;
import com.example.labelMark.domain.SysUser;
import com.example.labelMark.domain.TeamTable;
import com.example.labelMark.service.LoginService;
import com.example.labelMark.service.RoleService;
import com.example.labelMark.service.SysUserService;
import com.example.labelMark.service.TeamService;
import com.example.labelMark.utils.ResultGenerator;
import com.example.labelMark.vo.LoginUser;
import com.example.labelMark.vo.constant.Result;
import com.example.labelMark.vo.constant.StatusEnum;
import io.swagger.annotations.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import java.lang.reflect.InvocationTargetException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * <p>
 * 用户业务控制器
 * </p>
 *

 */
@RestController
@RequestMapping("/user")
@Api(tags = "用户业务控制器")
public class SysUserController {

    @Autowired
    SysUserService SysUserService;
    @Autowired
    RoleService roleService;
    @Autowired
    LoginService loginService;
    @Autowired
    TeamService teamService;

    /**
     * TODO 注册需要增加校验，目前同用户名仍可以注册
     *
     * @return
     */
    @ApiOperation("注册")
    @RequestMapping(value = "/register", method = RequestMethod.POST)
    public Result register(@RequestBody Map<String, Object> map) {
        String username = ObjectUtil.toString(map.get("userName"));
        String password = ObjectUtil.toString(map.get("userPassword"));
        Integer isAdmin = map.get("isAdmin") != null ? Integer.valueOf(ObjectUtil.toString(map.get("isAdmin"))) : 0;
        SysUser user = SysUserService.findByUsername(username);
        System.out.println(username);
        if (ObjectUtil.isNotNull(user)) {
            return ResultGenerator.getFailResult("用户已存在");
        }
        SysUser SysUser = new SysUser();
        SysUser.setUsername(username);
        // 设置用户是否为管理员，默认为普通用户(0)
        SysUser.setIsadmin(isAdmin);
        SysUser.setUserpassword(new BCryptPasswordEncoder().encode(password));
        int isCreated = SysUserService.createUser(SysUser);
        if (isCreated > 0) {
            return ResultGenerator.getSuccessResult("注册成功，账号：" + username);
        } else {
            return ResultGenerator.getFailResult("注册失败");
        }
    }

    @ApiOperation("登录")
    @PostMapping(value = "/login")
//   此参数待定，boolean isAutoLogin
    public Result login(@RequestBody Map<String, Object> map) throws InvocationTargetException {
        String username = ObjectUtil.toString(map.get("userName"));
        String password = ObjectUtil.toString(map.get("userPassword"));
        SysUser user = SysUserService.findByUsername(username);
        if (ObjectUtil.isNotNull(user)) {
            //        密码改为明码，和数据库的加密密码比对
            user.setUserpassword(password);
            Result result = loginService.login(user);
            return result;
        }
        return ResultGenerator.getFailResult("用户不存在");
    }

    @ApiOperation("密码重置")
    @RequestMapping(value = "/resetPassword", method = RequestMethod.POST)
    public Result resetPassword(@RequestBody Map<String, Object> map) {
        Integer userid = Integer.valueOf(ObjectUtil.toString(map.get("userid")));
        SysUser user = SysUserService.findByUserId(userid);
        if (ObjectUtil.isNotNull(user)) {
            boolean reset = SysUserService.resetPassword(user);
            if (reset) {
                return ResultGenerator.getSuccessResult("密码重置成功，密码为：88888888");
            } else {
                return ResultGenerator.getFailResult("密码重置失败");
            }
        }
        return ResultGenerator.getFailResult("用户不存在");
    }

    @ApiOperation("获取用户分页列表")
    @RequestMapping(value = "/getUsers", method = RequestMethod.GET)
    public Map getUsers(@RequestParam(required = false) Integer userid
            , @RequestParam(required = false) Integer isAdmin
            , @RequestParam(required = false) Integer current
            , @RequestParam(required = false) Integer pageSize
            , @RequestParam(required = false) String username) {
        try {
            // 无参时默认值
            if (ObjectUtil.isEmpty(current)) {
                current = 1;
            }
            if (ObjectUtil.isEmpty(pageSize)) {
                pageSize = 5;
            }
            
            // 获取当前登录用户信息
            LoginUser loginUser = (LoginUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            SysUser currentUser = loginUser.getSysUser();
            
            // 检查是否是管理员
            boolean isCurrentUserAdmin = currentUser.getIsadmin() == 1;
            Integer teamId = currentUser.getTeamId();

            long total;
            Page<SysUser> usersPage;
            
            // 如果当前用户是管理员且查看普通用户列表
            if (isCurrentUserAdmin && isAdmin != null && isAdmin == 0) {
                // 如果管理员的team_id为空，不显示任何用户
                if (teamId == null) {
                    Map<String, Object> map = new HashMap<>();
                    map.put("code", StatusEnum.SUCCESS);
                    map.put("data", new ArrayList<>());  // 返回空列表
                    map.put("total", 0);  // 总数为0
                    map.put("success", true);
                    return map;
                }
                
                // 团队管理员查看普通用户，只显示团队内的普通用户
                total = SysUserService.getUsersCountByAdminAndTeamId(isAdmin, teamId);
                usersPage = SysUserService.getUsersPageByTeamId(current, pageSize, userid, username, isAdmin, teamId);
            } else {
                // 非管理员查看用户列表，或管理员查看管理员列表
                if (isAdmin != null) {
                    total = SysUserService.getUsersCountByAdmin(isAdmin);
                } else {
                    total = SysUserService.getTotalCount();
                }
                usersPage = SysUserService.getUsersPage(current, pageSize, userid, username, isAdmin);
            }
            
            Map<String, Object> map = new HashMap<>();
            map.put("code", StatusEnum.SUCCESS);
            map.put("data", usersPage.getRecords());
            map.put("total", total);
            map.put("success", true);
            return map;
        } catch (Exception e) {
            Map<String, Object> map = new HashMap<>();
            map.put("code", StatusEnum.FAIL);
            map.put("success", false);
            map.put("message", e.getMessage());
            return map;
        }
    }

    @ApiOperation("删除用户")
    @RequestMapping(value = "/deleteUser/{userid}", method = RequestMethod.DELETE)
    public Result deleteUser(@PathVariable Integer userid) {
        SysUser user = SysUserService.findByUserId(userid);
        if (ObjectUtil.isNotNull(user)) {
            boolean isRemove = SysUserService.deleteUserById(userid);
            if (isRemove) {
                return ResultGenerator.getSuccessResult("用户已删除");
            } else {
                return ResultGenerator.getFailResult("用户删除失败");
            }
        }
        return ResultGenerator.getFailResult("用户不存在");
    }

    @ApiOperation("获得所有角色")
    @RequestMapping(value = "/getRoles", method = RequestMethod.GET)
    public Result getRoles() {
        List<Role> roles = roleService.getRoles();
        return ResultGenerator.getSuccessResult(roles);
    }

    @ApiOperation("更新用户信息")
    @RequestMapping(value = "/updateUser", method = RequestMethod.PUT)
    public Result updateUser(@RequestBody Map<String, Object> map) {
        String userid = ObjectUtil.toString(map.get("userid"));
        String username = ObjectUtil.toString(map.get("username"));
        String isadmin = ObjectUtil.toString(map.get("isadmin"));
        if (ObjectUtil.isNotNull(userid)) {
            boolean iaUpdateUser = SysUserService.updateUser(Integer.valueOf(userid), username, Integer.valueOf(isadmin));
            if (iaUpdateUser) {
                return ResultGenerator.getSuccessResult("用户信息更新成功");
            } else {
                return ResultGenerator.getFailResult("用户信息更新失败");
            }
        } else {
            return ResultGenerator.getFailResult("用户标识符不能为空");
        }
    }

    @ApiOperation("获取当前用户信息")
    @RequestMapping(value = "/currentState", method = RequestMethod.GET)
    public Map<String, Object> getCurrentState(HttpServletRequest request) {
        // 获取当前登录用户信息
        LoginUser loginUser = (LoginUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        SysUser currentUser = loginUser.getSysUser();
        Map<String, Object> map = new HashMap<>();
        map.put("currentUser", "");
        map.put("isAdmin", 0);
        map.put("score", 0);
        map.put("teamId", null);
        map.put("teamName", null);
        
        if (ObjectUtil.isNotNull(currentUser)) {
            // 从数据库重新查询最新的用户信息，确保积分是最新的
            SysUser latestUser = SysUserService.findByUserId(currentUser.getUserid());
            if (latestUser != null) {
                map.put("currentUser", latestUser.getUsername());
                map.put("isAdmin", latestUser.getIsadmin());
                map.put("score", latestUser.getScore() != null ? latestUser.getScore() : 0);
                
                // 添加团队信息
                if (latestUser.getTeamId() != null) {
                    map.put("teamId", latestUser.getTeamId());
                    // 获取团队名称
                    try {
                        TeamTable team = teamService.getById(latestUser.getTeamId());
                        if (team != null) {
                            map.put("teamName", team.getName());
                        }
                    } catch (Exception e) {
                        System.out.println("获取团队信息失败: " + e.getMessage());
                    }
                }
                
                // 添加日志输出，帮助调试
                System.out.println("从数据库获取的最新用户积分: " + latestUser.getScore());
                System.out.println("用户团队ID: " + latestUser.getTeamId());
            } else {
                // 如果从数据库查询失败，使用缓存的用户信息作为备用
                map.put("currentUser", currentUser.getUsername());
                map.put("isAdmin", currentUser.getIsadmin());
                map.put("score", currentUser.getScore() != null ? currentUser.getScore() : 0);
                
                if (currentUser.getTeamId() != null) {
                    map.put("teamId", currentUser.getTeamId());
                    try {
                        TeamTable team = teamService.getById(currentUser.getTeamId());
                        if (team != null) {
                            map.put("teamName", team.getName());
                        }
                    } catch (Exception e) {
                        System.out.println("获取团队信息失败: " + e.getMessage());
                    }
                }
                
                System.out.println("使用缓存的用户积分: " + currentUser.getScore());
            }
        }
        return map;
    }

    @ApiOperation("登出")
    @RequestMapping(value = "/outLogin", method = RequestMethod.POST)
    public Result logout() {
        Result result = loginService.logout();
        return result;
    }

    /**
     * 根据用户名获取用户信息
     */
    @GetMapping("/getByUsername")
    public ResponseEntity<?> getUserByUsername(@RequestParam String username) {
        QueryWrapper<SysUser> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("username", username);
        SysUser user = SysUserService.getOne(queryWrapper);
        if (user != null) {
            return ResponseEntity.ok(user);
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }
    }
}
