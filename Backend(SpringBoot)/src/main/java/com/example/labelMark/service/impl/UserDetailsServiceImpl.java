package com.example.labelMark.service.impl;

import cn.hutool.core.util.ObjectUtil;
import com.example.labelMark.domain.SysUser;
import com.example.labelMark.service.SysUserService;
import com.example.labelMark.vo.LoginUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * @Description 用于结合SpringSecurity实现登录的功能实现类
 * 
 * @Date 2024/4/17
 */
@Service
//public class UserDetailsServiceImpl{
public class UserDetailsServiceImpl implements UserDetailsService {
    @Autowired
    SysUserService SysUserService;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        SysUser user = SysUserService.findByUsername(username);
        if (ObjectUtil.isNotNull(user)) {
            return new LoginUser(user);
        } else {
            //如果查询不到数据就通过抛出异常来给出提示
            throw new RuntimeException("用户名或密码错误");
        }
    }
}
