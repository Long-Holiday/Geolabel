package com.example.labelMark.controller;

import cn.hutool.core.util.ObjectUtil;
import com.example.labelMark.domain.Mark;
import com.example.labelMark.domain.Type;
import com.example.labelMark.service.MarkService;
import com.example.labelMark.service.TaskService;
import com.example.labelMark.service.ModelService; // 新增导入
import com.example.labelMark.service.TypeService;
import com.example.labelMark.service.TaskAcceptedService;
import com.example.labelMark.utils.CoordinateConverter;
import com.example.labelMark.utils.ResultGenerator;
import com.example.labelMark.vo.constant.Result;
import com.example.labelMark.vo.constant.StatusEnum;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.bind.annotation.*;
import com.fasterxml.jackson.core.type.TypeReference;

import javax.annotation.Resource;
import java.nio.file.Files;
import java.util.*;
import java.util.stream.Collectors;

// 导入 Jep 相关的类
//import jep.JepConfig;
//import jep.JepException;
//import jep.SharedInterpreter;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.springframework.web.client.RestTemplate;
import com.alibaba.fastjson.JSONObject;

import com.example.labelMark.service.TaskExecutorService;

/**
 * <p>
 *  前端控制器
 * </p>
 *

 */
@RestController
@RequestMapping("/mark")
public class MarkController {

    @Resource
    private MarkService markService;

    @Resource
    private TaskService taskService;

    @Resource // 新增注入
    private ModelService modelService;

    @Resource
    private TaskAcceptedService taskAcceptedService;

    @Resource
    private TypeService typeService;

    @Resource
    private TaskExecutorService taskExecutorService;

    @PostMapping("/saveMarkInfo")
    public Result saveMarkInfo(@RequestBody Map<String, Object> request) {
        Integer userId = Integer.valueOf(request.get("userid").toString());
        Integer taskId = Integer.valueOf(request.get("id").toString());
        List<Map<String, Object>> typeIdAndMarkInfoArr = (List<Map<String, Object>>) request.get("jsondataArr");
        List<Map<String, Object>> typeMapArr = (List<Map<String, Object>>) request.get("typeArr");
        // 检查是否将当前用户设为唯一执行者
        boolean setAsSubmitter = false;
        if (request.containsKey("setAsSubmitter")) {
            setAsSubmitter = Boolean.valueOf(request.get("setAsSubmitter").toString());
        }
        
        List<Type> typeArr = new ArrayList<>();
        for (Map typeMap : typeMapArr) {
            Type type = new Type();
            Integer typeId = Integer.valueOf(typeMap.get("typeId").toString());
            String typeName = typeMap.get("typeName").toString();
            String typeColor = typeMap.get("typeColor").toString();
            type.setTypeColor(typeColor);
            type.setTypeName(typeName);
            type.setTypeId(typeId);
            typeArr.add(type);
        }
        List<Map<String, Object>> geometryArr = CoordinateConverter.convertCoordinate(typeIdAndMarkInfoArr);
        List<Map<String, Object>> markInfoArr = geometryArr;
        if (markInfoArr.isEmpty()) {
            return ResultGenerator.getSuccessResult("没有标注信息，已删除多余Type");
        }

        markService.deleteMarkByTaskAndUser(taskId, userId);

        boolean exist = markService.isMark(taskId, userId);
        if(exist) {
            taskService.updateTask(taskId, null);
            updateTaskAndMark(userId, taskId, markInfoArr);
            
            // 如果需要将当前用户设为唯一执行者
            if (setAsSubmitter) {
                // 1. 更新task表中的submitter_id为当前用户ID
                taskService.updateTaskSubmitter(taskId, userId);
                
                // 2. 删除task_accepted表中除当前用户外的所有与该任务相关的记录
                taskAcceptedService.deleteOtherUsers(taskId, userId);
            }
            
            return ResultGenerator.getSuccessResult("已有有标注信息，已完成更新");
        } else {
            updateTaskAndMark(userId, taskId, markInfoArr);
            
            // 如果需要将当前用户设为唯一执行者
            if (setAsSubmitter) {
                // 1. 更新task表中的submitter_id为当前用户ID
                taskService.updateTaskSubmitter(taskId, userId);
                
                // 2. 删除task_accepted表中除当前用户外的所有与该任务相关的记录
                taskAcceptedService.deleteOtherUsers(taskId, userId);
            }
        }
        return ResultGenerator.getSuccessResult("mark创建成功");
    }

    private void updateTaskAndMark(Integer userId, int taskId, List<Map<String, Object>> markInfoArr) {
        for (Map<String, Object> geomAndTypeId : markInfoArr) {
            Mark mark = new Mark();
            Integer markId = ObjectUtil.isNotNull(geomAndTypeId.get("markId"))
                    ? Integer.valueOf(geomAndTypeId.get("markId").toString()) : null;
            mark.setId(markId);
            mark.setTaskId(taskId);
            mark.setUserId(userId);
            
            // Get the geometry directly from the input
            String geomJson = (String) geomAndTypeId.get("geom");
            // Parse the geometry JSON to use directly without adding additional wrapper
            JSONObject geometryObject = JSONObject.parseObject(geomJson);
            
            // Create a proper GeoJSON Feature with the geometry
            JSONObject geom = new JSONObject();
            geom.put("type", "Feature");
            geom.put("properties", new JSONObject());
            geom.put("geometry", geometryObject);
            
            mark.setGeom(geom);
            mark.setStatus(0);
            mark.setTypeId(Integer.valueOf(geomAndTypeId.get("typeId").toString()));
            markService.insertOrUpdateMark(mark);
            
            String markIdStr = taskService.getMarkIdById(taskId);
            markIdStr = markIdStr == null ? mark.getId().toString()
                    : markIdStr + "," + mark.getId().toString();
            taskService.updateTask(taskId, markIdStr);
        }
    }

    @PostMapping("/inferenceFunction")
    public Map<String, Object> PythonScript_inferenceFunction(@RequestBody Map<String, Object> request) {
        // 获取前端传来的参数
        String taskId = request.get("taskid").toString();
        String userId = request.get("user_id").toString();
        String model_name = request.get("model") != null ? request.get("model").toString() : "";

        // 获取 parameters 对象
        @SuppressWarnings("unchecked")
        Map<String, Object> params = (Map<String, Object>) request.get("parameters");

        // 获取参数，处理可能的 null 值
        String param1 = params.get("param1") != null ? params.get("param1").toString() : "";
        String param2 = params.get("param2") != null ? params.get("param2").toString() : "";
        String param3 = params.get("param3") != null ? params.get("param3").toString() : "";
        String param4 = params.get("param4") != null ? params.get("param4").toString() : "";
        
        // 处理categoryMapping，确保是有效的JSON格式
        String categoryMapping = "{}";
        if (params.get("categoryMapping") != null) {
            try {
                ObjectMapper objectMapper = new ObjectMapper();
                Map<String, Object> mappingMap;
                // 尝试将参数解析为Map
                if (params.get("categoryMapping") instanceof String) {
                    mappingMap = objectMapper.readValue(params.get("categoryMapping").toString(), 
                                                      new TypeReference<Map<String, Object>>() {});
                } else {
                    mappingMap = (Map<String, Object>) params.get("categoryMapping");
                }
                // 转换为标准JSON字符串
                categoryMapping = objectMapper.writeValueAsString(mappingMap);
            } catch (Exception e) {
                // 如果解析失败，使用空对象
                System.err.println("解析categoryMapping失败: " + e.getMessage());
                categoryMapping = "{}";
            }
        }

        // 获取 modelScope 数据
        String modelScopeStr = "";
        if (params.containsKey("modelScope") && params.get("modelScope") != null) {
            Object modelScope = params.get("modelScope");
            try {
                ObjectMapper objectMapper = new ObjectMapper();
                modelScopeStr = objectMapper.writeValueAsString(modelScope);
            } catch (JsonProcessingException e) {
                e.printStackTrace();
                Map<String, Object> response = new HashMap<>();
                response.put("code", StatusEnum.FAIL.code);
                response.put("message", "解析模型作用范围失败: " + e.getMessage());
                return response;
            }
        } else {
            modelScopeStr = "[]"; // 如果没有 modelScope，传递空数组
        }

        // 设置文件路径
        String file_name = taskService.getServerById(Integer.parseInt(taskId));

        Path mapfile_path = Path.of(Paths.get(System.getProperty("user.dir") + File.separator +
                "src/main/java/com/example/labelMark/resource/output") + File.separator + file_name);

        // 准备请求体
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("taskid", taskId);
        requestBody.put("mapfile_path", mapfile_path.toString());
        requestBody.put("user_id", userId);
        requestBody.put("model", model_name);
        requestBody.put("param1", param1);
        requestBody.put("param2", param2);
        requestBody.put("param3", param3);
        requestBody.put("param4", param4);
        requestBody.put("categoryMapping", categoryMapping); // 使用处理后的JSON字符串
        requestBody.put("modelScopeStr", modelScopeStr);

        // 将任务提交到队列异步执行
        taskExecutorService.executeInferenceFunctionAsync(requestBody);
        
        // 返回任务已提交的响应
        Map<String, Object> response = new HashMap<>();
        response.put("code", 200);
        response.put("message", "任务已提交，正在后台处理中");
        return response;
    }

    //响应前端辅助功能
    @PostMapping("/assistFunction")
    public Map<String, Object> assistFunction(@RequestBody Map<String, Object> request) {
        // 获取前端传来的参数
        String taskId = request.get("taskid").toString();
        String functionName = request.get("functionName").toString();
        String assistInput = request.get("assistInput") != null ? request.get("assistInput").toString() : "";
        String userId = request.get("user_id") != null ? request.get("user_id").toString() : null;
        String modelName = request.get("modelName") != null ? request.get("modelName").toString() : null;
        String tasktype = request.get("task_type") != null ? request.get("task_type").toString() : "";
        @SuppressWarnings("unchecked")
        Map<String, Object> params = (Map<String, Object>) request.get("parameters");

        // 获取参数，处理可能的 null 值
        String param1 = params.get("param1") != null ? params.get("param1").toString() : "";
        String param2 = params.get("param2") != null ? params.get("param2").toString() : "";
        String param3 = params.get("param3") != null ? params.get("param3").toString() : "";
        String param4 = params.get("param4") != null ? params.get("param4").toString() : "";
        
        // 处理categoryMapping，确保是有效的JSON格式
        String categoryMapping = "{}";
        if (params.get("categoryMapping") != null) {
            try {
                ObjectMapper objectMapper = new ObjectMapper();
                Map<String, Object> mappingMap;
                // 尝试将参数解析为Map
                if (params.get("categoryMapping") instanceof String) {
                    mappingMap = objectMapper.readValue(params.get("categoryMapping").toString(), 
                                    new TypeReference<Map<String, Object>>() {});
                } else {
                    mappingMap = (Map<String, Object>) params.get("categoryMapping");
                }
                // 转换为标准JSON字符串
                categoryMapping = objectMapper.writeValueAsString(mappingMap);
            } catch (Exception e) {
                // 如果解析失败，使用空对象
                System.err.println("解析categoryMapping失败: " + e.getMessage());
                categoryMapping = "{}";
            }
        }

        // 获取 modelScope 数据
        String modelScopeStr = "";
        if (params.containsKey("modelScope") && params.get("modelScope") != null) {
            Object modelScope = params.get("modelScope");
            try {
                ObjectMapper objectMapper = new ObjectMapper();
                modelScopeStr = objectMapper.writeValueAsString(modelScope);
            } catch (JsonProcessingException e) {
                e.printStackTrace();
                Map<String, Object> response = new HashMap<>();
                response.put("code", StatusEnum.FAIL.code);
                response.put("message", "解析模型作用范围失败: " + e.getMessage());
                return response;
            }
        }

        // 设置文件路径
        String file_name = taskService.getServerById(Integer.parseInt(taskId));

        Path mapfile_path = Path.of(Paths.get(System.getProperty("user.dir") + File.separator +
                "src/main/java/com/example/labelMark/resource/output") + File.separator + file_name);

        // 准备请求体
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("taskid", taskId);
        requestBody.put("mapfile_path", mapfile_path.toString());
        requestBody.put("functionName", functionName);
        requestBody.put("assistInput", assistInput);
        requestBody.put("modelName", modelName);
        requestBody.put("param1", param1);
        requestBody.put("param2", param2);
        requestBody.put("param3", param3);
        requestBody.put("param4", param4);
        requestBody.put("categoryMapping", categoryMapping); // 使用处理后的JSON字符串
        requestBody.put("user_id", userId);
        requestBody.put("modelScopeStr", modelScopeStr);
        requestBody.put("tasktype", tasktype);

        System.out.println(requestBody);

        // 根据功能名称选择执行方式
        if ("sam_inference".equals(functionName) || "xgboost".equals(functionName)) {
            // SAM预标注和提取目标功能立即执行
            try {
                String url = "http://localhost:5000/assistFunction";
                RestTemplate restTemplate = new RestTemplate();
                Map<String, Object> response = restTemplate.postForObject(url, requestBody, Map.class);
                
                if (response != null && response.get("code").equals(200)) {
                    return response;
                } else {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("code", 500);
                    errorResponse.put("message", "执行失败: " + (response != null ? response.get("message") : "未知错误"));
                    return errorResponse;
                }
            } catch (Exception e) {
                e.printStackTrace();
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("code", 500);
                errorResponse.put("message", "执行失败: " + e.getMessage());
                return errorResponse;
            }
        } else {
            // 其他功能（如深度学习模型训练）仍然使用队列异步执行
            taskExecutorService.executeAssistFunctionAsync(requestBody);
            
            // 返回任务已提交的响应
            Map<String, Object> response = new HashMap<>();
            response.put("code", 200);
            response.put("message", "任务已提交，正在后台处理中");
            return response;
        }
    }

    @PostMapping("/getModelList")
    public Map<String, Object> getModelList(@RequestBody Map<String, String> request) {
        // 获取前端传来的用户ID和任务类型
        String userIdStr = request.get("user_id");
        String taskType = request.get("task_type"); // 新增任务类型参数
        System.out.println("当前userid为" + userIdStr + ", taskType为" + taskType);

        Map<String, Object> response = new HashMap<>();

        if (userIdStr == null || userIdStr.trim().isEmpty()) {
            response.put("code", StatusEnum.FAIL.code);
            response.put("message", "用户ID不能为空");
            return response;
        }

        try {
            Integer userId = Integer.valueOf(userIdStr);
            Map<String, String> modelMap;
            
            // 根据是否传递task_type来决定获取模型的方式
            if (taskType != null && !taskType.trim().isEmpty()) {
                // 按任务类型筛选模型
                modelMap = modelService.getModelMapByUserId(userId, taskType);
                System.out.println("按任务类型筛选 - Model List for user " + userId + " and taskType " + taskType + ": " + modelMap);
            } else {
                // 获取该用户的全部模型数据
                modelMap = modelService.getModelMapByUserId(userId);
                System.out.println("获取全部模型 - Model List for user " + userId + ": " + modelMap);
            }

            if (modelMap.isEmpty()) {
                response.put("code", StatusEnum.SUCCESS.code);
                response.put("message", taskType != null ? "该用户在此任务类型下没有关联的模型" : "该用户没有关联的模型");
                response.put("data", new HashMap<>()); // 返回空 Map
            } else {
                response.put("code", StatusEnum.SUCCESS.code);
                response.put("message", "成功获取模型列表");
                response.put("data", modelMap);
            }

            return response;

        } catch (NumberFormatException e) {
            response.put("code", StatusEnum.FAIL.code);
            response.put("message", "无效的用户ID格式");
            return response;
        } catch (Exception e) {
            e.printStackTrace();
            response.put("code", StatusEnum.FAIL.code);
            response.put("message", "获取模型列表失败: " + e.getMessage());
            return response;
        }
    }

    //响应前端样本更新
    @PostMapping("/update_label")
    public Map<String, Object> PythonScript_updatelabel(@RequestBody Map<String, Object> request) { // 返回 Map
        //得到前端传回的taskid，并且设置python文件以及tif影像所在位置
        Integer taskId = Integer.valueOf(request.get("taskid").toString());
        Path mapfile_path = Paths.get(System.getProperty("user.dir")+ File.separator + "src/main/java/com/example/labelMark/resource/output");

        // 准备请求体
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("taskid", taskId.toString());
        requestBody.put("mapfile_path", mapfile_path.toString());

        try {
            // 立即执行更新样本功能，不使用队列
            String url = "http://localhost:5000/update_label";
            RestTemplate restTemplate = new RestTemplate();
            Map<String, Object> response = restTemplate.postForObject(url, requestBody, Map.class);
            
            if (response != null && response.get("code").equals(200)) {
                return response;
            } else {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("code", 500);
                errorResponse.put("message", "更新样本失败: " + (response != null ? response.get("message") : "未知错误"));
                return errorResponse;
            }
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("code", 500);
            errorResponse.put("message", "更新样本失败: " + e.getMessage());
            return errorResponse;
        }
//        try {
//            //将"/home/change/anaconda3/envs/label_env/bin/python"换成你python解释器的路径位置
//            ProcessBuilder pb = new ProcessBuilder("/home/change/anaconda3/envs/label/bin/python", python_path.toString());
//            //设置需要传个python的变量
//            pb.command().add(taskId.toString());
//            pb.command().add(mapfile_path.toString());
//            Process process = pb.start();
//
//            BufferedReader stdInput = new BufferedReader(new InputStreamReader(process.getInputStream()));
//            BufferedReader stdError = new BufferedReader(new InputStreamReader(process.getErrorStream()));
//
//            String s;
//            StringBuilder output = new StringBuilder();
//            while ((s = stdInput.readLine()) != null) {
//                output.append(s).append("\n");
//            }
//
//            StringBuilder errorOutput = new StringBuilder();
//            while ((s = stdError.readLine()) != null) {
//                errorOutput.append(s).append("\n");
//            }
//
//            int exitCode = process.waitFor();
//
//            if (exitCode == 0) {
//                // 成功
//                System.out.println("Python 脚本输出: " + output);
//
//                // 直接返回 Map，不包含 data
//                Map<String, Object> response = new HashMap<>();
//                response.put("code", StatusEnum.SUCCESS.code);
//                response.put("message", "成功更新样本");
//                return response;
//
//
//            } else {
//                // 失败
//                System.err.println("Python 脚本错误输出: " + errorOutput);
//                Map<String, Object> response = new HashMap<>();
//                response.put("code", StatusEnum.FAIL.code);
//                response.put("message", "更新样本失败: " + errorOutput);
//                return response;
//            }
//
//        } catch (IOException | InterruptedException e) {
//            e.printStackTrace();
//            Map<String, Object> response = new HashMap<>();
//            response.put("code", StatusEnum.FAIL.code);
//            response.put("message", "更新样本失败: " + e.getMessage());
//            return response;
//        }
    }
}
