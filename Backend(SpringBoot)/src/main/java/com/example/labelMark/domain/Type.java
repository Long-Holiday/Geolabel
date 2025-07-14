package com.example.labelMark.domain;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;

/**
 * 
 * @TableName type
 */
@TableName(value ="type")
@Data
public class Type implements Serializable {
    /**
     * 
     */
    @TableId(value = "type_id")
    private Integer typeId;

    /**
     * 
     */
    @TableField(value = "type_name")
    private String typeName;

    /**
     * 
     */
    @TableField(value = "type_color")
    private String typeColor;

    /**
     * 
     */


    @TableField(exist = false)
    private static final long serialVersionUID = 1L;
}