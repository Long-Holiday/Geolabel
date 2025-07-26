package com.example.labelMark.controller;

import cn.hutool.core.util.ObjectUtil;
import com.example.labelMark.utils.ResultGenerator;
import com.example.labelMark.vo.constant.Result;
import com.example.labelMark.domain.Type;
import com.example.labelMark.service.TypeService;
import com.example.labelMark.vo.constant.StatusEnum;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/type")
@Api(tags = "类型业务控制器")
public class TypeController {

    @Resource
    private TypeService typeService;

    @GetMapping("/getTypePage")
    @ApiOperation("获取类型")
    public Map getTypePage(@RequestParam(required = false) Integer current,
                           @RequestParam(required = false) Integer pageSize,
                           @RequestParam(required = false) Integer typeId,
                           @RequestParam(required = false) String typeName) {
        try {
//            无参时默认值
            if (ObjectUtil.isEmpty(current)) {
                current = 1;
            }
            if (ObjectUtil.isEmpty(pageSize)) {
                pageSize = 5;
            }
            List<Type> types = typeService.getTypes(current, pageSize, typeId, typeName);
            Map<String, Object> map = new HashMap<>();
            map.put("code", StatusEnum.SUCCESS);
            map.put("data", types);
            map.put("total", types.size());
            map.put("success", true);
            return map;
        } catch (Exception e) {
            Map<String, Object> map = new HashMap<>();
            map.put("code", StatusEnum.FAIL);
            map.put("success", false);
            map.put("message", e.getMessage());
            return map;
        }
    }

    @PostMapping("/createType")
    public Result createType(@RequestBody Map<String, Object> map) {
        String typeId = map.get("typeId").toString();
        String typeName = map.get("typeName").toString();
        String typeColor = map.get("typeColor").toString();
        // 获取数据库TypeId种类
        List<Integer> IDs = typeService.getId();

        if (IDs.contains(Integer.valueOf(typeId))) {
            return ResultGenerator.getFailResult("该id已存在，请重新输入");
        } else {
            // 创建type
            typeService.createType(Integer.valueOf(typeId), typeName, typeColor);
            return ResultGenerator.getSuccessResult();
        }
    }

    @PutMapping("/updateType")
    public Result updateType(@RequestBody Map<String, Object> map) {
        String typeId = ObjectUtil.toString(map.get("typeId"));
        String typeName = ObjectUtil.toString(map.get("typeName"));
        String typeColor = ObjectUtil.toString(map.get("typeColor"));
        Type type = new Type();
        type.setTypeId(Integer.valueOf(typeId));
        type.setTypeName(typeName);
        type.setTypeColor(typeColor);
        typeService.updateType(type);
        return ResultGenerator.getSuccessResult();
    }

    @DeleteMapping("/deleteType/{typeId}")
    public Result deleteTypeById(@PathVariable Integer typeId) {
        typeService.deleteTypeById(typeId);
        return ResultGenerator.getSuccessResult();
    }

    @GetMapping("/getTypeById")
    public Result getTypeById(Integer typeId) {
        Type type = typeService.getTypeById(typeId);
        return ResultGenerator.getSuccessResult(type);
    }

    @GetMapping("/getTypeNameById")
    public Result getTypeNameById(Integer typeId){
        String name = typeService.getTypeNameById(typeId);
        return ResultGenerator.getSuccessResult(name);
    }

}

