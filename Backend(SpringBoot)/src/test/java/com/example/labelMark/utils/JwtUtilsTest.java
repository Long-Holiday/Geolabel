//package com.example.labelMark.utils;
//
//import com.auth0.jwt.JWT;
//import com.auth0.jwt.algorithms.Algorithm;
//import org.junit.jupiter.api.BeforeEach;
//import org.junit.jupiter.api.Test;
//import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
//import org.springframework.security.crypto.password.PasswordEncoder;
//
//import java.util.Date;
//
//import static org.junit.jupiter.api.Assertions.assertEquals;
//import static org.junit.jupiter.api.Assertions.assertNotNull;
//
//class JwtUtilsTest {
//
//    private JwtUtils jwtUtils;
//
//    @BeforeEach
//    void setUp() {
//        jwtUtils = new JwtUtils();
//        // 如果JwtUtils类需要初始化，你可以在这里进行初始化
//    }
//
//    @Test
//    void testCreateToken() {
//        String subject = "123";
//        String key= "321456";
//        Algorithm ALGORITHM = Algorithm.HMAC256(key);
//        String token= JWT.create()
//                .withClaim("name",subject)
//                .withClaim("id",2)
//                .withExpiresAt(new Date(System.currentTimeMillis() + 3600_000))  // 1 hour
//                .sign(ALGORITHM);
////        String token = jwtUtils.createToken(subject,2);
//
//        // 验证token不为空
//        assertNotNull(token);
//        System.out.println("token = " + token);
//        // 验证token可以被正确解码
//
//
//        Integer decodedSubject = JWT.require(ALGORITHM)
//                .build()
//                .verify(token)
//                .getClaim("id")
//                .asInt();
//
//
////        assertEquals(subject, decodedSubject);
//        System.out.println("id = " + decodedSubject);
//// 创建BCryptPasswordEncoder对象
//PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
//
//    // 加密密码
//    String rawPassword = "123456";
//    String encodedPassword = passwordEncoder.encode(rawPassword);
////        BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
////        String encodedPassword = passwordEncoder.encode("123456");
//        System.out.println("Encoded Password: " + encodedPassword);
//
//    // 验证密码
//    boolean matches = passwordEncoder.matches(rawPassword, encodedPassword);
//        System.out.println("Password Matches: " + matches);
//    }
//
//}