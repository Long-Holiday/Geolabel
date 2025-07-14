package com.example.labelMark;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class userArr_test {
    public static void main(String[] args) {
        String[][] userArr={
            {"Alice", "1"},
            {"Bob", "2"},
            {"Alice", "3"},
            {"Alice", "4"},
            {"Bob", "1,3"}
        };

        Map<String, List<String>> user_TypeArr  = new HashMap<>();

        for (String[] userarr : userArr){
            String username = userarr[0];
            String type_arr = userarr[1];

            user_TypeArr.putIfAbsent(username, new ArrayList<>());

            user_TypeArr.get(username).add(type_arr);
        }

        System.out.println(user_TypeArr);
    }
}
