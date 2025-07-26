package com.example.labelMark.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

/**
 * <p>
 * 团队表实体类
 * </p>
 *
 * 
 * @since 2025-05-17
 */
@Getter
@Setter
@TableName("team_table")
@ApiModel(value = "TeamTable对象", description = "团队信息表")
public class TeamTable implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty("团队ID")
    @TableId(value = "team_id", type = IdType.AUTO)
    private Integer teamId;

    @ApiModelProperty("团队名称")
    @TableField("name")
    private String name;

    @ApiModelProperty("团队码")
    @TableField("code")
    private String code;
} 