//package com.example.labelMark.handle;
//
//import com.alibaba.fastjson.JSON;
//import org.slf4j.Logger;
//import org.springframework.http.HttpStatus;
//import org.springframework.security.core.AuthenticationException;
//import org.springframework.security.web.AuthenticationEntryPoint;
//import org.springframework.stereotype.Component;
//
//import javax.servlet.ServletException;
//import javax.servlet.http.HttpServletRequest;
//import javax.servlet.http.HttpServletResponse;
//import java.io.IOException;
//import java.io.PrintWriter;
//import java.time.LocalDateTime;
//import java.util.HashMap;
//import java.util.Map;
//
///**
// * @Description  非登录情况认证失败的处理类
// * 
// * @Date 2024/4/18
// */
//@Component
//public class UsernamePasswordAuthenticationEntryPoint implements AuthenticationEntryPoint {
//    @Override
//    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException) throws IOException, ServletException {
//        response.setContentType("application/json;charset=utf-8");
//        response.setHeader("WWW-Authenticate", "Bearer");
//        response.addHeader("Access-Control-Allow-Origin", "*");
//        response.setStatus(HttpStatus.UNAUTHORIZED.value());
//        PrintWriter out = response.getWriter();
//        Map<String,Object> data = new HashMap<>();
//        data.put("code", HttpStatus.UNAUTHORIZED.value());
//        data.put("message", "认证失败");
//        out.write(JSON.toJSONString(data));
//        out.flush();
//        out.close();
//    }
//}
