package com.example.labelMark.controller;

import com.example.labelMark.domain.Model;
import com.example.labelMark.service.ModelService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.annotation.Resource;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 模型管理控制器
 */
@RestController
@RequestMapping("/model")
public class ModelController {

    @Resource
    private ModelService modelService;



    /**
     * 根据用户ID获取模型列表
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Model>> getModelsByUserId(@PathVariable Integer userId, @RequestParam(required = false) String taskType) {
        List<Model> models;
        if (taskType != null && !taskType.isEmpty()) {
            models = modelService.getModelListByUserId(userId, taskType);
        } else {
            // 如果未提供taskType，则获取用户的所有模型
            models = modelService.getModelListByUserIdWithoutTaskType(userId);
        }
        return ResponseEntity.ok(models);
    }

    /**
     * 上传模型文件并保存模型信息
     */
    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadModel(
            @RequestParam("file") MultipartFile file,
            @RequestParam("modelName") String modelName,
            @RequestParam("modelDes") String modelDes,
            @RequestParam("inputNum") Integer inputNum,
            @RequestParam("outputNum") Integer outputNum,
            @RequestParam("taskType") String taskType,
            @RequestParam("userId") Integer userId) {

        Map<String, Object> response = new HashMap<>();

        try {
            // 确保目录存在 - 使用与train.py相同的路径格式
            String baseDir = "/home/change/labelcode/labelMark";
            String uploadDir = baseDir + "/trained_models/" + userId;
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // 根据任务类型创建子目录
            String subDir = "地物分类".equals(taskType) ? "segmentation_results" : "detection_results";
            String taskTypeDir = uploadDir + File.separator + subDir;
            Path taskTypePath = Paths.get(taskTypeDir);
            if (!Files.exists(taskTypePath)) {
                Files.createDirectories(taskTypePath);
            }

            // 保留原始文件名，避免重命名导致模型加载问题
            String originalFilename = file.getOriginalFilename();
            String filePath = taskTypeDir + File.separator + originalFilename;

            // 检查文件是否已存在，如果存在则添加时间戳
            Path targetPath = Paths.get(filePath);
            if (Files.exists(targetPath)) {
                String nameWithoutExt = originalFilename.substring(0, originalFilename.lastIndexOf("."));
                String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
                String timestamp = String.valueOf(System.currentTimeMillis());
                filePath = taskTypeDir + File.separator + nameWithoutExt + "_" + timestamp + extension;
                targetPath = Paths.get(filePath);
            }

            // 保存文件
            Files.copy(file.getInputStream(), targetPath);

            // 保存模型信息到数据库
            Model model = new Model();
            model.setModelName(modelName);
            model.setModelDes(modelDes);
            model.setInputNum(inputNum);
            model.setOutputNum(outputNum);
            model.setTaskType(taskType);
            model.setUserId(userId);
            model.setPath(filePath);
            model.setStatus(1);
            model.setModelType(originalFilename.substring(originalFilename.lastIndexOf(".") + 1));

            boolean saved = modelService.saveModel(model);

            if (saved) {
                response.put("success", true);
                response.put("message", "Model uploaded successfully");
                response.put("model", model);
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Failed to save model information");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
        } catch (IOException e) {
            response.put("success", false);
            response.put("message", "Failed to upload model: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 删除模型
     */
    @DeleteMapping("/{modelId}")
    public ResponseEntity<Map<String, Object>> deleteModel(@PathVariable Integer modelId) {
        Map<String, Object> response = new HashMap<>();

        // 获取模型信息，以便删除文件
        Model model = modelService.getById(modelId);
        if (model != null && model.getPath() != null) {
            try {
                // 删除文件
                Path filePath = Paths.get(model.getPath());
                Files.deleteIfExists(filePath);
            } catch (IOException e) {
                // 文件删除失败，但仍然可以继续删除数据库记录
                response.put("warning", "Model file could not be deleted: " + e.getMessage());
            }
        }

        boolean deleted = modelService.deleteModel(modelId);
        if (deleted) {
            response.put("success", true);
            response.put("message", "Model deleted successfully");
            return ResponseEntity.ok(response);
        } else {
            response.put("success", false);
            response.put("message", "Failed to delete model");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 更新模型信息
     */
    @PutMapping("/{modelId}")
    public ResponseEntity<Map<String, Object>> updateModel(@PathVariable Integer modelId, @RequestBody Model model) {
        Map<String, Object> response = new HashMap<>();

        model.setModelId(modelId);
        boolean updated = modelService.updateModel(model);

        if (updated) {
            response.put("success", true);
            response.put("message", "Model updated successfully");
            return ResponseEntity.ok(response);
        } else {
            response.put("success", false);
            response.put("message", "Failed to update model");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
} 