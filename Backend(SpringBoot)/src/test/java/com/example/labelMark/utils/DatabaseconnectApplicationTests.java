package com.example.labelMark.utils;

import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@Slf4j
@SpringBootTest
class DatabaseconnectApplicationTests {

    @Autowired
    JdbcTemplate jdbcTemplate;


    @Test
    void testOracleConnect(){
        //USERINFO是你自己连接数据库中的表，这里查询的是记录的数目
        Long aL = jdbcTemplate.queryForObject("select count(*) from type",Long.class);
        log.info("test OracleConnect : {} 条",aL);
    }

}
