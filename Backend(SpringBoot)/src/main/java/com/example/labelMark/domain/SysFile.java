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
 *
 * </p>
 *
 */
@Getter
@Setter
@TableName("file")
@ApiModel(value = "File对象", description = "")
public class SysFile implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(value = "file_id", type = IdType.AUTO)
    private Integer fileId;

    @TableField("file_name")
    private String fileName;

    @TableField("update_time")
    private String updateTime;

    @TableField("status")
    private Integer status;

    @TableField("size")
    private String size;
    
    @ApiModelProperty("用户ID")
    @TableField("user_id")
    private Integer userId;
    
    @ApiModelProperty("影像集名称")
    @TableField("set_name")
    private String setName;

}
