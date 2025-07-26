package com.example.labelMark.utils;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.generator.FastAutoGenerator;
import com.baomidou.mybatisplus.generator.config.OutputFile;
import com.baomidou.mybatisplus.generator.config.rules.DateType;
import com.baomidou.mybatisplus.generator.engine.FreemarkerTemplateEngine;
import com.baomidou.mybatisplus.generator.fill.Column;
import com.baomidou.mybatisplus.generator.fill.Property;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * @Description
 * 
 * @Date 2024/4/15
 */
public class newMPGenerator {
    // 配置数据库信息
    private static final String URL = "jdbc:postgresql://localhost:5432/postgres?useUnicode=true&characterEncoding=utf8&zeroDateTimeBehavior=convertToNull&useSSL=true&serverTimezone=GMT%2B8";
    private static final String USERNAME = "postgres";
    private static final String PASSWORD = "123456";
    private static final String driverClassName = "org.postgresql.Driver";

    public static void main(String[] args) {
        // 数据源配置
        FastAutoGenerator.create("jdbc:postgresql://localhost:5432/postgres?sample_imgTimezone=GMT%2B8", "postgres", "123456")
                .globalConfig(builder -> {
                    builder.author("hjw")        // 设置作者
                            .enableSwagger()        // 开启 swagger 模式 默认值:false
                            .fileOverride() // 覆盖已生成文件
                            .disableOpenDir()       // 禁止打开输出目录 默认值:true
                            .commentDate("yyyy-MM-dd") // 注释日期
                            .dateType(DateType.ONLY_DATE)   //定义生成的实体类中日期类型 DateType.ONLY_DATE 默认值: DateType.TIME_PACK
                            .outputDir(System.getProperty("user.dir") + "/src/main/java"); // 指定输出目录

                })

                .packageConfig(builder -> {
                    builder.parent("com.example.labelMark") // 父包模块名
                            .controller("controller")   //Controller 包名 默认值:controller
                            .entity("domain")           //Entity 包名 默认值:entity
                            .service("service")         //Service 包名 默认值:service
                            .mapper("mapper")           //Mapper 包名 默认值:mapper
                            .serviceImpl("service.impl") // Service Impl 包名 默认值:service.impl
                            .other("model")
                            //.moduleName("xxx")        // 设置父包模块名 默认值:无
                            .pathInfo(Collections.singletonMap(OutputFile.xml, System.getProperty("user.dir") + "/src/main/resources/mapper")); // 设置mapperXml生成路径
                    //默认存放在mapper的xml下
                })
                //注入配置
                /* .injectionConfig(consumer -> {
                     Map<String, String> customFile = new HashMap<>();
                     // DTO、VO
                     customFile.put("DTO.java", "/templates/entityDTO.java.ftl");
                     customFile.put("VO.java", "/templates/entityVO.java.ftl");

                     consumer.customFile(customFile);
                 })*/

                .strategyConfig(builder -> {
                    try {
                        builder.addInclude("sample_img") // 设置需要生成的表名 可边长参数“user”, “user1”，此处匹配所有表(填写数据库名)
                                //                            .addTablePrefix("tb_", "gms_") // 设置过滤表前缀
                                .serviceBuilder()//service策略配置
                                .formatServiceFileName("%sService")
                                .formatServiceImplFileName("%sServiceImpl")
                                .entityBuilder()// 实体类策略配置
                                .idType(IdType.ASSIGN_ID)//主键策略  雪花算法自动生成的id
                                .addTableFills(new Column("create_time", FieldFill.INSERT)) // 自动填充配置
                                .addTableFills(new Property("update_time", FieldFill.INSERT_UPDATE))
                                .enableLombok() //开启lombok
                                .logicDeleteColumnName("deleted")// 说明逻辑删除是哪个字段
                                .enableTableFieldAnnotation()// 属性加上注解说明
                                .controllerBuilder() //controller 策略配置
                                .formatFileName("%sController")
                                .enableRestStyle() // 开启RestController注解
                                .mapperBuilder()// mapper策略配置
                                .formatMapperFileName("%sMapper")
                                .enableMapperAnnotation()//@mapper注解开启
                                .formatXmlFileName("%sMapper");
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }
                })
//                自定义生成文件的模板文件位置
/*                .templateConfig(builder -> {
                    builder.service("/templates/service.java")
                            .serviceImpl("/templates/serviceImpl.java")
                            .mapper(null)
                            .xml(null)
                            .controller("/templates/controller.java");
                })*/

// 使用Freemarker引擎模板，默认的是Velocity引擎模板
                .templateEngine(new FreemarkerTemplateEngine())
//                .templateEngine(new EnhanceFreemarkerTemplateEngine())

                .execute();


    }

    // 获取某个数据库中的所有表名

    private static String[] getTables(String dbName) throws Exception {
        List<String> tables = new ArrayList<>();

        Connection connection = null;
        PreparedStatement ps = null;
        ResultSet resultSet = null;
        try {
            Class.forName(driverClassName);
            connection = DriverManager.getConnection(URL, USERNAME, PASSWORD);
            String sql = "select table_name from information_schema.tables where table_schema=?";
            ps = connection.prepareStatement(sql);
            ps.setString(1, dbName);
            resultSet = ps.executeQuery();
            while (resultSet.next()) {
                tables.add(resultSet.getString("table_name"));
            }
            String[] result = tables.toArray(new String[tables.size()]);
            return result;
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (resultSet != null) {
                try {
                    resultSet.close();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
            if (ps != null) {
                try {
                    ps.close();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
            if (connection != null) {
                try {
                    connection.close();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }
        throw new Exception("数据库连接异常！");
    }
}
