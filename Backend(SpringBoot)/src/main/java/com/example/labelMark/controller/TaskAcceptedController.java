package com.example.labelMark.controller;

import com.example.labelMark.service.TaskAcceptedService;
import com.example.labelMark.utils.ResultGenerator;
import com.example.labelMark.vo.constant.Result;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;

/**
 * <p>
 *  前端控制器
 * </p>
 *
 */
@RestController
@RequestMapping("/taskAccepted")
public class TaskAcceptedController {

    @Resource
    private TaskAcceptedService taskAcceptedService;

    @GetMapping("/createTaskAccept")
    public Result createTaskAccept(Integer task_id, String username, String typeArr){
        taskAcceptedService.createTaskAccept(task_id, username, typeArr);
        return ResultGenerator.getSuccessResult("插入TaskAccept成功，");
    }

    // 通过task_id删除TaskAccept
    @GetMapping("/deleteTaskAcceptById")
    public Result deleteTaskAcceptById(int ID){
        taskAcceptedService.deleteTaskAcceptByTaskId(ID);
        return ResultGenerator.getSuccessResult("删除成功");
    }

}
