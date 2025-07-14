package com.example.labelMark.utils;

import java.util.UUID;

public class UuidUtils {
    public static String getUUID(){
        return UUID.randomUUID().toString().replace("-", "");
    }

}
