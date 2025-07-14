package com.example.labelMark.utils;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import io.jsonwebtoken.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

/**
 * @description:用于处理Jwt令牌的工具类
 * @author: lf
 * @date:2023/12/3
 */
@Component
public class JwtUtil {
/*    //用于给Jwt令牌签名校验的秘钥
    @Value("${spring.security.jwt.key}")
    private String key;
    //令牌的过期时间，以小时为单位
    @Value("${spring.security.jwt.expire}")
    private int expire;*/
////    //为用户生成Jwt令牌的冷却时间，防止刷接口频繁登录生成令牌，以秒为单位
////    @Value("${spring.security.jwt.limit.base}")
////    private int limit_base;
////    //用户如果继续恶意刷令牌，更严厉的封禁时间
////    @Value("${spring.security.jwt.limit.upgrade}")
////    private int limit_upgrade;
////    //判定用户在冷却时间内，继续恶意刷令牌的次数
////    @Value("${spring.security.jwt.limit.frequency}")
////    private int limit_frequency;
    /*    */

    /**
     * @DESCRIPTION: 创建token
     * @param:
     * @return:
     */

    public String createToken(String subject, int userId) {
        Algorithm ALGORITHM = Algorithm.HMAC256(JWT_KEY);
        return JWT.create()
                .withClaim("name", subject)
                .withClaim("id", userId)
                .withExpiresAt(new Date(System.currentTimeMillis() + JWT_TTL * 3600_000))  // 1 hour
                .sign(ALGORITHM);
    }

    public Integer getIdFromToken(String token) {
        Algorithm ALGORITHM = Algorithm.HMAC256(JWT_KEY);
        return JWT.require(ALGORITHM)
                .build()
                .verify(token)
                .getClaim("id")
                .asInt();
    }

    public String getEmailFromToken(String token) {
        Algorithm ALGORITHM = Algorithm.HMAC256(JWT_KEY);
        return JWT.require(ALGORITHM)
                .build()
                .verify(token)
                .getClaim("input")
                .asString();
    }

    /**
     * 校验并转换请求头中的Token令牌
     *
     * @param headerToken 请求头中的Token
     * @return 转换后的令牌
     */
    public String convertToken(String headerToken) {
        if (headerToken == null || !headerToken.startsWith("Bearer "))
            return null;
        return headerToken.substring(7);
    }

    //有效期为
    public static final Long JWT_TTL = 5 * 60 * 60 * 1000L;// 60 * 60 *1000  5个小时
    //设置秘钥明文
    public static final String JWT_KEY = "sangeng";

    public static String getUUID() {
        String token = UUID.randomUUID().toString().replaceAll("-", "");
        return token;
    }

    /**
     * 生成jwt,默认五小时过期
     *
     * @param subject token中要存放的数据（json格式）
     * @return
     */
    public static String createJWT(String subject) {
        JwtBuilder builder = getJwtBuilder(subject, JWT_TTL, getUUID());// 设置过期时间
        return builder.compact();
    }

    /**
     * 生成jwt
     *
     * @param subject   token中要存放的数据（json格式）
     * @param ttlMillis token超时时间
     * @return
     */
    public static String createJWT(String subject, Long ttlMillis) {
        JwtBuilder builder = getJwtBuilder(subject, ttlMillis, getUUID());// 设置过期时间
        return builder.compact();
    }

    private static JwtBuilder getJwtBuilder(String subject, Long ttlMillis, String uuid) {
        SignatureAlgorithm signatureAlgorithm = SignatureAlgorithm.HS256;
        SecretKey secretKey = generalKey();
        long nowMillis = System.currentTimeMillis();
        Date now = new Date(nowMillis);
        if (ttlMillis == null) {
            ttlMillis = JwtUtil.JWT_TTL;
        }
        long expMillis = nowMillis + ttlMillis;
        Date expDate = new Date(expMillis);
        return Jwts.builder()
                .setId(uuid)              //唯一的ID
                .setSubject(subject)   // 主题  可以是JSON数据
                .setIssuer("sg")     // 签发者
                .setIssuedAt(now)      // 签发时间
                .signWith(signatureAlgorithm, secretKey) //使用HS256对称加密算法签名, 第二个参数为秘钥
                .setExpiration(expDate);
    }

    /**
     * 创建token
     *
     * @param id
     * @param subject
     * @param ttlMillis
     * @return
     */
    public static String createJWT(String id, String subject, Long ttlMillis) {
        JwtBuilder builder = getJwtBuilder(subject, ttlMillis, id);// 设置过期时间
        return builder.compact();
    }

    public static void main(String[] args) throws Exception {
        String token = "eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJjYWM2ZDVhZi1mNjVlLTQ0MDAtYjcxMi0zYWEwOGIyOTIwYjQiLCJzdWIiOiJzZyIsImlzcyI6InNnIiwiaWF0IjoxNjM4MTA2NzEyLCJleHAiOjE2MzgxMTAzMTJ9.JVsSbkP94wuczb4QryQbAke3ysBDIL5ou8fWsbt_ebg";
        Claims claims = parseJWT(token);
        System.out.println(claims);
    }

    /**
     * 生成加密后的秘钥 secretKey
     *
     * @return
     */
    public static SecretKey generalKey() {
        byte[] encodedKey = Base64.getDecoder().decode(JwtUtil.JWT_KEY);
        SecretKey key = new SecretKeySpec(encodedKey, 0, encodedKey.length, "AES");
        return key;
    }

    /**
     * 解析
     *
     * @param jwt
     * @return
     * @throws Exception
     */
    public static Claims parseJWT(String jwt) throws Exception {
        SecretKey secretKey = generalKey();
        return Jwts.parser()
                .setSigningKey(secretKey)
                .parseClaimsJws(jwt)
                .getBody();
    }

}
