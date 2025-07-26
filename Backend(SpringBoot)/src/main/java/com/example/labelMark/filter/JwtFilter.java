package com.example.labelMark.filter;

import com.example.labelMark.utils.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.annotation.Resource;
import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Map;

/**
 * 用于对请求头中Jwt令牌进行校验的工具，为当前请求添加用户验证信息
 * 并将用户的ID存放在请求对象属性中，方便后续使用
 */
@Component
public class JwtFilter extends OncePerRequestFilter {
    @Resource
    JwtUtil utils;
    @Autowired
//    private RedisTemplate<String, Object> redisTemplate;
//    暂时不用这个filter
    private RedisTemplate<Object, Object> redisTemplate;
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        // 从请求头中获取JWT
        String headerToken = request.getHeader("Authorization");
        String token = utils.convertToken(headerToken);

        if (token != null) {
            try {
                // 验证JWT
                int userId = utils.getIdFromToken(token);
                System.out.println("Filter中的userId:" + userId);

                // 从Redis中获取用户信息
                Map<Object, Object> userInfo = redisTemplate.opsForHash().entries("user:" + userId);
                System.out.println("Filter中的userInfo:" + userInfo);
//                如果用户信息不为空，说明用户合法，将用户信息存入SecurityContext
                if (userInfo != null&&userInfo.size()!=0) {
                    // 创建一个Authentication对象，并将其存储在SecurityContext中
                    Authentication authentication = new UsernamePasswordAuthenticationToken(
                            userInfo.get("name"), null, new ArrayList<>());
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }else{
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "请先登录");
                    return;
                }
            } catch (Exception e) {
                // 如果JWT无效或已过期，或者用户信息不存在，清除SecurityContext
                SecurityContextHolder.clearContext();
                // 发送一个错误响应
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "请先登录");
                return;
            }
        }

        // 继续处理请求
        filterChain.doFilter(request, response);
    }

}
