package com.example.labelMark.service;

import com.example.labelMark.domain.SysUser;
import com.example.labelMark.vo.constant.Result;

import java.lang.reflect.InvocationTargetException;

/**
 * @Description
 * 
 * @Date 2024/4/17
 */
public interface LoginService {
    Result login(SysUser user) throws InvocationTargetException;

    Result logout();
}
