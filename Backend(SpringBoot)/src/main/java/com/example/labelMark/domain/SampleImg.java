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
@TableName("sample_img")
@ApiModel(value = "SampleImg对象", description = "")
public class SampleImg implements Serializable {

    private static final long serialVersionUID = 1L;

    @TableId(value = "img_id", type = IdType.AUTO)
    private Integer imgId;

    @TableField("sample_id")
    private Integer sampleId;

    @TableField("img_src")
    private String imgSrc;

    @TableField("type_id")
    private Integer typeId;


}
