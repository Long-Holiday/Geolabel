package com.example.labelMark.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

/**
 * <p>
 *
 * </p>
 *
 */
@Data
@TableName("server")
@ApiModel(value = "Server对象", description = "")
public class Server implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(value = "ser_id", type = IdType.AUTO)
    private Integer serId;

    @TableField(value = "ser_name")
    private String serName;

    @TableField("ser_desc")
    private String serDesc;

    @TableField("ser_year")
    private String serYear;

    @TableField("publisher")
    private String publisher;

    @TableField("publish_url")
    private String publishUrl;

    @ApiModelProperty("发布日期")
    @TableField("publish_time")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private String publishTime;
    
    @ApiModelProperty("用户ID")
    @TableField("user_id")
    private Integer userId;
    
    @ApiModelProperty("影像集名称")
    @TableField("set_name")
    private String setName;

}
