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
import com.alibaba.fastjson.JSONObject;
import com.example.labelMark.config.JsonObjectTypeHandler;
import org.apache.ibatis.type.JdbcType;

import javax.validation.constraints.Pattern;

/**
 * <p>
 *
 * </p>
 *
 */
@Getter
@Setter
@TableName("mark")
@ApiModel(value = "Mark对象", description = "")
public class Mark implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(value = "id", type = IdType.AUTO)
    private Integer id;

    @ApiModelProperty("任务ID")
    @TableField("task_id")
    private Integer taskId;

    @ApiModelProperty("用户ID")
    @TableField("user_id")
    private Integer userId;

    @ApiModelProperty("类型ID")
    @TableField("type_id")
    private Integer typeId;

    @ApiModelProperty("标注信息，是标注区域的GeoJSON格式")
    @TableField(value = "geom", typeHandler = JsonObjectTypeHandler.class, jdbcType = JdbcType.OTHER)
    private JSONObject geom;

    @ApiModelProperty("0 未通过，1 通过")
    @TableField("status")
    private Integer status;

}
