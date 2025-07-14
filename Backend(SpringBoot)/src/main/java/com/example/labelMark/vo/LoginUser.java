package com.example.labelMark.vo;

import com.example.labelMark.domain.SysUser;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;

/**
 * @Description 用于结合SpringSecurity实现登录的实体类
 * 
 * @Date 2024/4/17
 */
@Data
public class LoginUser implements UserDetails {
    private SysUser SysUser;
    private String token;

    public LoginUser(SysUser SysUser) {
        this.SysUser = SysUser;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return null;
    }

    @Override
    public String getPassword() {
        return SysUser.getUserpassword();
    }

    @Override
    public String getUsername() {
        return SysUser.getUsername();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

}
