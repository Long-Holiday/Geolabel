package com.example.labelMark.service.impl;

import cn.hutool.core.date.DateUnit;
import cn.hutool.core.date.DateUtil;
import cn.hutool.core.util.ObjectUtil;
import com.example.labelMark.domain.SysUser;
import com.example.labelMark.service.LoginService;
import com.example.labelMark.utils.JwtUtil;
import com.example.labelMark.utils.RedisCache;
import com.example.labelMark.utils.ResultGenerator;
import com.example.labelMark.vo.LoginUser;
import com.example.labelMark.vo.constant.Result;
import com.example.labelMark.vo.constant.StatusEnum;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.lang.reflect.InvocationTargetException;
import java.util.Date;
import java.util.HashMap;

/**
 * @Description 重写Security中的登录登出方法
 * 
 * @Date 2024/4/17
 */
@Service
public class LoginServiceImpl implements LoginService {
    @Autowired
    private AuthenticationManager authenticationManager;
    @Autowired
    private RedisCache redisCache;

    @Override
    public Result login(SysUser user) throws InvocationTargetException {
        UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(user.getUsername(), user.getUserpassword());
        Authentication authenticate = authenticationManager.authenticate(authenticationToken);
        if (ObjectUtil.isNull(authenticate)) {
            throw new RuntimeException("用户名或密码错误");
        }
        //使用userid生成token
        LoginUser loginUser = (LoginUser) authenticate.getPrincipal();
        String userId = loginUser.getSysUser().getUserid().toString();
        //authenticate存入redis,包括token
        String jwt = JwtUtil.createJWT(userId);
        loginUser.setToken(jwt);
        redisCache.setCacheObject("login:" + userId, loginUser);
        //把token响应给前端
        HashMap<String, Object> map = new HashMap<>();
        map.put("token", jwt);
//        map.put("expirationDate", DateUtil.offsetHour(new Date(), 5));
        return ResultGenerator.getSuccessResult(StatusEnum.SUCCESS, "登陆成功", map);
    }

    @Override
    public Result logout() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        LoginUser loginUser = (LoginUser) authentication.getPrincipal();
        Integer userid = loginUser.getSysUser().getUserid();
        redisCache.deleteObject("login:" + userid);
        return ResultGenerator.getSuccessResult("登出成功");
    }
}
