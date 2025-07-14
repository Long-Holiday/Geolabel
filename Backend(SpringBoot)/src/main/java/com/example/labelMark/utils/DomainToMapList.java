package com.example.labelMark.utils;

import com.alibaba.fastjson.JSONObject;
import java.lang.reflect.Field;
import java.util.*;
import java.util.stream.Collectors;

public class DomainToMapList {

    // 通用方法，将 List<T> 转换为 List<Map<String, Object>>
    public static <T> List<Map<String, Object>> convertDomainListToMapList(List<T> domainList) {
        return domainList.stream().map(DomainToMapList::convertDomainToMap).collect(Collectors.toList());
    }

    // 将单个对象 T 转换为 Map<String, Object>
    private static <T> Map<String, Object> convertDomainToMap(T domain) {
        Map<String, Object> map = new HashMap<>();
        Field[] fields = domain.getClass().getDeclaredFields();
        for (Field field : fields) {
            field.setAccessible(true); // 设置访问权限，允许反射访问私有变量
            try {
                Object value = field.get(domain);
                // 如果值是JSONObject，转换为String
                if (value instanceof JSONObject) {
                    map.put(field.getName(), ((JSONObject) value).toJSONString());
                } else {
                    map.put(field.getName(), value);
                }
            } catch (IllegalAccessException e) {
                e.printStackTrace();
            }
        }
        return map;
    }
}
