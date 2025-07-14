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
 * 数据集实体类
 * </p>
 *
 */
@Getter
@Setter
@TableName("dataset")
@ApiModel(value = "Dataset对象", description = "数据集信息")
public class Dataset implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @TableId(value = "dataset_id", type = IdType.AUTO)
    private Integer datasetId;

    @ApiModelProperty("样本集名称")
    @TableField("name")
    private String name;

    @ApiModelProperty("样本集描述")
    @TableField("set_dess")
    private String setDess;

    @ApiModelProperty("样本集缩略图")
    @TableField("thumb_url")
    private String thumbUrl;

    @ApiModelProperty("样本集数量")
    @TableField("num")
    private Integer num;

    @ApiModelProperty("联系人")
    @TableField("cont")
    private String cont;

    @ApiModelProperty("邮箱")
    @TableField("email")
    private String email;

    @ApiModelProperty("包含类别")
    @TableField("sorts")
    private String sorts;

    @ApiModelProperty("用户ID")
    @TableField("user_id")
    private Integer userId;

    @ApiModelProperty("兑换该数据集需要的积分")
    @TableField("goal")
    private Integer goal;

    @ApiModelProperty("任务类型")
    @TableField("task_type")
    private String taskType;

    @ApiModelProperty("样本ID")
    @TableField("sample_id")
    private String sampleId;
} 