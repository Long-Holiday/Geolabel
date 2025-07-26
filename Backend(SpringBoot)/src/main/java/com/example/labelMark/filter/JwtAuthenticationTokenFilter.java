package com.example.labelMark.filter;

import cn.hutool.core.date.DateUnit;
import cn.hutool.core.date.DateUtil;
import cn.hutool.core.util.ObjectUtil;
import cn.hutool.core.util.StrUtil;
import com.alibaba.fastjson.JSON;
import com.example.labelMark.utils.JwtUtil;
import com.example.labelMark.utils.RedisCache;
import com.example.labelMark.vo.LoginUser;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * @Description
 * 
 * @Date 2024/4/17
 */
@Component
public class JwtAuthenticationTokenFilter extends OncePerRequestFilter {
    @Autowired
    private RedisCache redisCache;
    @Autowired
    public RedisTemplate redisTemplate;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        //获取token，前端header首字母自动大写
        String token = request.getHeader("Token");
        if (StrUtil.isBlank(token)) {
            //放行
            filterChain.doFilter(request, response);
            return;
        }

        //解析token
        //        不论是否过期都返回Claims对象
        String userid;
        Claims claims;
        Date expiration;//过期时间
        try {
            claims = JwtUtil.parseJWT(token);
            userid = claims.getSubject();
            expiration = claims.getExpiration();
        } catch (ExpiredJwtException e) {
            claims = e.getClaims();
            userid = claims.getSubject();
            expiration = claims.getExpiration();
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("token非法");
        }
//        token过期
        if (expiration.before(new Date())) {
            response.setContentType("application/json;charset=utf-8");
            response.addHeader("Access-Control-Allow-Origin", "*");
            response.setStatus(HttpStatus.FORBIDDEN.value());
            PrintWriter out = response.getWriter();
            Map<String, Object> data = new HashMap<>();
            data.put("code", HttpStatus.FORBIDDEN.value());
            data.put("message", "token过期");
            out.write(JSON.toJSONString(data));
            out.flush();
            out.close();
            return;
        }
        //        token30分钟内过期在刷新有效期
        if (DateUtil.between(expiration, new Date(), DateUnit.MINUTE) < 30) {
            claims.setExpiration(DateUtil.offsetHour(new Date(), 5));
        }
        //从redis中获取用户信息
        String redisKey = "login:" + userid;
        LoginUser loginUser = redisCache.getCacheObject(redisKey);
        if (ObjectUtil.isNull(loginUser)) {
            throw new RuntimeException("用户未登录");
        }
        //存入SecurityContextHolder
        //TODO 获取权限信息封装到Authentication中
        UsernamePasswordAuthenticationToken authenticationToken =
                new UsernamePasswordAuthenticationToken(loginUser, null, null);
        SecurityContextHolder.getContext().setAuthentication(authenticationToken);
        //放行
        filterChain.doFilter(request, response);
    }
}
