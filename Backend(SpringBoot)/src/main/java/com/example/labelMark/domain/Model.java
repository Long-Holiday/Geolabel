package com.example.labelMark.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import javax.persistence.Column;
import java.io.Serializable;

/**
 * <p>
 * 模型表
 * </p>
 *
 */
@Data
@TableName("model")
public class Model implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(value = "model_id", type = IdType.AUTO)
    @TableField("model_id")
    private Integer modelId;

    @TableField("user_id")
    private Integer userId;

    @TableField("model_name")
    private String modelName;

    @TableField("model_des")
    private String modelDes;

    @TableField("task_type")
    private String taskType;

    @TableField("path")
    private String path;

    @TableField("input_num")
    private Integer inputNum;

    @TableField("output_num")
    private Integer outputNum;

    @TableField("status")
    private Integer status;

    @TableField("model_type")
    private String modelType;

    // 可以根据实际表结构添加其他字段

}