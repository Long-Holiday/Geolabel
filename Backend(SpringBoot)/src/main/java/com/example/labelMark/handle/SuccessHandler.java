//package com.example.labelMark.handle;
//
//import com.alibaba.fastjson.JSON;
//import org.springframework.http.HttpStatus;
//import org.springframework.security.core.Authentication;
//import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
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
// * @Description 登录成功的处理器
// * 
// * @Date 2024/4/24
// */
//@Component
//public class SuccessHandler implements AuthenticationSuccessHandler {
//    @Override
//    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
//        response.setContentType("application/json;charset=utf-8");
//        response.addHeader("Access-Control-Allow-Origin", "*");
//        response.setStatus(HttpStatus.ACCEPTED.value());
//        PrintWriter out = response.getWriter();
//        Map<String,Object> data = new HashMap<>();
//        data.put("code", HttpStatus.ACCEPTED.value());
//        data.put("message", "登录成功");
//        out.write(JSON.toJSONString(data));
//        out.flush();
//        out.close();
//    }
//}
