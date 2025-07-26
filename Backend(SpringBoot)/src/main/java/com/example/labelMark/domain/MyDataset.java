package com.example.labelMark.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Getter;
import lombok.Setter;

/**
 * <p>
 * 用户已兑换的数据集
 * </p>
 *
 */
@Getter
@Setter
@TableName("mydataset")
@ApiModel(value = "MyDataset对象", description = "用户已兑换的数据集")
public class MyDataset implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(value = "id", type = IdType.AUTO)
    private Integer id;

    @ApiModelProperty("拥有者")
    @TableField("user_id")
    private Integer userId;

    @TableField("dataset_id")
    private Integer datasetId;
} 