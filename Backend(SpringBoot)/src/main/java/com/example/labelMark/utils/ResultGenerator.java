package com.example.labelMark.utils;

import com.example.labelMark.vo.constant.Result;
import com.example.labelMark.vo.constant.StatusEnum;

public class ResultGenerator {
    private static final String DEFAULT_SUCCESS_MESSAGE = "SUCCESS";

    // 只返回状态
    public static Result getSuccessResult() {
        return new Result()
                .setCode(StatusEnum.SUCCESS)
                .setMessage(DEFAULT_SUCCESS_MESSAGE);
    }
    // 返回特定信息状态
    public static Result getSuccessResult(String message) {
        return new Result()
                .setCode(StatusEnum.SUCCESS)
                .setMessage(message);
    }

    // 成功返回数据
    public static Result getSuccessResult(Object data) {
        return new Result()
                .setCode(StatusEnum.SUCCESS)
                .setMessage(DEFAULT_SUCCESS_MESSAGE)
                .setData(data);
    }

    // 成功返回数据
    public static Result getSuccessResult(StatusEnum code, String message, Object data) {
        return new Result()
                .setCode(code)
                .setMessage(message)
                .setData(data);
    }

    // 常规请求失败，返回403
    public static Result getFailResult(String message) {
        return new Result()
                .setCode(StatusEnum.FAIL)
                .setMessage(message);
    }

    //特定请求失败，返回状态码
    public static Result getFailResult(String message, StatusEnum statusEnum) {
        return new Result()
                .setCode(statusEnum)
                .setMessage(message);
    }
}
