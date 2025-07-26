package com.example.labelMark.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.example.labelMark.domain.Role;

import java.util.List;

/**
 * <p>
 * 服务类
 * </p>
 *
 * 
 * @since 2024-04-12
 */
public interface RoleService extends IService<Role> {
    List<Role> getRoles();
}
