package com.example.labelMark.utils;

import java.text.SimpleDateFormat;
import java.util.Date;

public class CommUtils {
    public static String getNowDateLongStr(String pattern) {
        SimpleDateFormat dateFormat = new SimpleDateFormat(pattern);
        return dateFormat.format(new Date());
    }
}
