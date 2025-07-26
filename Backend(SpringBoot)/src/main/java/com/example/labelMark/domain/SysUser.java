package com.example.labelMark.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.io.Serializable;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Getter;
import lombok.NonNull;
import lombok.Setter;

/**
 * <p>
 *
 * </p>
 *
 * 
 * @since 2024-04-15
 */
@Getter
@Setter
@TableName("sys_user")
@ApiModel(value = "User对象", description = "")
public class SysUser implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty("用户标识符")
    @TableId(value = "user_id", type = IdType.AUTO)
    private Integer userid;

    @TableField("username")
    private String username;

    @TableField("user_password")
    private String userpassword;
    @ApiModelProperty("是否是管理员")
    @TableField("is_admin")
    @NonNull
    private Integer isadmin;
    @ApiModelProperty("完成任务数量")
    @TableField("finished_num")
    private Integer finishednum;
    @ApiModelProperty("未完成任务数")
    @TableField("unfinished_num")
    private Integer unfinishednum;
    
    @ApiModelProperty("团队ID")
    @TableField("team_id")
    private Integer teamId;

    @ApiModelProperty("积分")
    @TableField("score")
    private Integer score;
}
