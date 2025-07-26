package com.example.labelMark.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import io.swagger.models.auth.In;
import lombok.Getter;
import lombok.Setter;

/**
 * <p>
 *
 * </p>
 *
 * 
 * @since 2024-04-25
 */
@Getter
@Setter
@TableName("task_accepted")
@ApiModel(value = "TaskAccepted对象", description = "")
public class TaskAccepted implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableField("task_id")
    private Integer taskId;

    @TableId(value = "id", type = IdType.AUTO)
    private Integer id;

    @TableField("username")
    private String username;

    @TableField("type_arr")
    private String typeArr;


}
