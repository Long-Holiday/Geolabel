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
import org.springframework.data.annotation.Id;

import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;

/**
 * <p>
 * 
 * </p>
 *
 */
@Getter
@Setter
@TableName("dataset_store")
@ApiModel(value = "DatasetStore对象", description = "")
public class DatasetStore implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @TableId(value = "sample_id", type = IdType.AUTO)
    private Integer sampleId;

    @TableField("sample_name")
    private String sampleName;

    @TableField("task_id")
    private Integer taskId;

    @ApiModelProperty("1公开，0不公开")
    @TableField("is_public")
    private Integer isPublic;
    
    @TableField("user_id")
    private Integer userId;

    @ApiModelProperty("样本图像保存本地地址")
    @TableField("p_url")
    private String pUrl;

}
