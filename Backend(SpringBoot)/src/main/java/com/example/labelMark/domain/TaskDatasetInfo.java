package com.example.labelMark.domain;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import org.apache.ibatis.annotations.Result;

@AllArgsConstructor
@Getter
@Setter
public class TaskDatasetInfo {

    private Task task;

    private int sampleId;

    private String sampleName;

    private int isPublic;


}
