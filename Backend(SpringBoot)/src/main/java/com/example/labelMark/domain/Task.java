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
import org.springframework.format.annotation.DateTimeFormat;

import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.validation.constraints.Pattern;

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
@TableName("task")
@ApiModel(value = "Task对象", description = "")
public class Task implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @TableId(value = "task_id", type = IdType.AUTO)
    private Integer taskId;

    @TableField("task_name")
    private String taskName;

    @TableField("task_type")
    private String taskType;

    @TableField("map_server")
    private String mapServer;

    @TableField("date_range")
    @Pattern(regexp = "^(\\d{4}-\\d{2}-\\d{2}) (\\d{4}-\\d{2}-\\d{2})$", message = "日期范围格式不正确")
    @DateTimeFormat(pattern = "yyyy-MM-dd")
    private String dateRange;

    @ApiModelProperty("0审核中，1审核通过，2审核失败，3未提交")
    @TableField("status")
    private Integer status;

    @ApiModelProperty("标记ID拼接字符")
    @TableField("mark_id")
    private String markId;

    @ApiModelProperty("审核反馈")
    @TableField("audit_feedback")
    private String auditFeedback;

    @ApiModelProperty("0为团队任务；1为非团队任务")
    @TableField("task_class")
    private Integer taskClass;

    @ApiModelProperty("创建者ID")
    @TableField("user_id")
    private Integer userId;

    @ApiModelProperty("完成任务获得积分")
    @TableField("score")
    private Integer score;

    @ApiModelProperty("提交者ID")
    @TableField("submitter_id")
    private Integer submitterId;
}
