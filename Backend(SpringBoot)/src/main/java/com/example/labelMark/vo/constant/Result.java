package com.example.labelMark.vo.constant;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import lombok.Data;

/**
 * @Description 统一API响应结果封装
 * 
 * @Date 2024/4/14
 */
@Data
// 非空返回
@JsonSerialize(include = JsonSerialize.Inclusion.NON_NULL)
public class Result<T> {
    private int code;

    private String message = "success";

    private T data;

    public Result setCode(StatusEnum resultCode) {
        this.code = resultCode.code;
        return this;
    }

    public Result setMessage(String message) {
        this.message = message;
        return this;
    }

    public Result setData(T data) {
        this.data = data;
        return this;
    }
}
