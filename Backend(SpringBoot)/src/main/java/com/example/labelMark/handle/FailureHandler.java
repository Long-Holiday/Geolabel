//package com.example.labelMark.handle;
//
//import com.alibaba.fastjson.JSON;
//import org.springframework.http.HttpStatus;
//import org.springframework.security.core.AuthenticationException;
//import org.springframework.security.web.authentication.AuthenticationFailureHandler;
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
// * @Description
// * 
// * @Date 2024/4/24
// */
//@Component
//public class FailureHandler implements AuthenticationFailureHandler {
//    @Override
//    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception) throws IOException, ServletException {
//        response.setContentType("application/json;charset=utf-8");
//        response.addHeader("Access-Control-Allow-Origin", "*");
//        response.setStatus(HttpStatus.FORBIDDEN.value());
//        PrintWriter out = response.getWriter();
//        Map<String,Object> data = new HashMap<>();
//        data.put("code", HttpStatus.FORBIDDEN.value());
//        data.put("message", "登录失败");
//        out.write(JSON.toJSONString(data));
//        out.flush();
//        out.close();
//    }
//}
