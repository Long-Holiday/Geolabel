package com.example.labelMark.controller;

import com.example.labelMark.domain.Dataset;
import com.example.labelMark.service.DatasetService;
import com.example.labelMark.vo.constant.Result;
import com.example.labelMark.utils.ResultGenerator;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.util.List;
import java.util.Map;

/**
 * <p>
 * 数据集控制器
 * </p>

 */
@RestController
@RequestMapping("/dataset")
public class DatasetController {

    @Resource
    private DatasetService datasetService;

    /**
     * 发布共享数据集
     * 
     * @param params 请求参数
     * @return 结果
     */
    @PostMapping("/publishSharedDataset")
    public Result publishSharedDataset(@RequestBody Map<String, Object> params) {
        try {
            @SuppressWarnings("unchecked")
            List<String> sampleIds = (List<String>) params.get("sampleIds");
            String name = (String) params.get("name");
            String setDess = (String) params.get("setDess");
            String cont = (String) params.get("cont");
            String email = (String) params.get("email");
            Integer goal = 0; // 默认积分为0
            if (params.containsKey("goal") && params.get("goal") != null) {
                try {
                    Object goalObj = params.get("goal");
                    if (goalObj instanceof Integer) {
                        goal = (Integer) goalObj;
                    } else if (goalObj instanceof Double) {
                        goal = ((Double) goalObj).intValue();
                    } else {
                        String goalStr = goalObj.toString().trim();
                        if (!goalStr.isEmpty()) {
                            goal = Integer.parseInt(goalStr);
                        }
                    }
                    if (goal < 0) goal = 0; // 确保积分为非负
                } catch (NumberFormatException e) {
                    goal = 0; // 解析失败默认为0
                }
            }
            
            if (sampleIds == null || sampleIds.isEmpty()) {
                return ResultGenerator.getFailResult("样本ID不能为空");
            }
            
            if (name == null || name.trim().isEmpty()) {
                return ResultGenerator.getFailResult("数据集名称不能为空");
            }
            
            Integer datasetId = datasetService.publishSharedDataset(sampleIds, name, setDess, cont, email, goal);
            
            if (datasetId == null) {
                return ResultGenerator.getFailResult("发布共享数据集失败");
            }
            
            return ResultGenerator.getSuccessResult(datasetId);
        } catch (Exception e) {
            e.printStackTrace();
            return ResultGenerator.getFailResult("发布共享数据集失败：" + e.getMessage());
        }
    }
    
    /**
     * 根据用户ID查询数据集
     * 
     * @param userId 用户ID
     * @return 结果
     */
    @GetMapping("/findDatasetByUserId")
    public Result findDatasetByUserId(@RequestParam Integer userId) {
        try {
            List<Dataset> datasets = datasetService.findDatasetByUserId(userId);
            return ResultGenerator.getSuccessResult(datasets);
        } catch (Exception e) {
            e.printStackTrace();
            return ResultGenerator.getFailResult("查询数据集失败：" + e.getMessage());
        }
    }
    
    /**
     * 查询所有数据集
     * 
     * @return 结果
     */
    @GetMapping("/findAllDatasets")
    public Result findAllDatasets() {
        try {
            List<Dataset> datasets = datasetService.findAllDatasets();
            return ResultGenerator.getSuccessResult(datasets);
        } catch (Exception e) {
            e.printStackTrace();
            return ResultGenerator.getFailResult("查询所有数据集失败：" + e.getMessage());
        }
    }
    
    /**
     * 获取数据集缩略图
     * 
     * @param imagePath 图像路径
     * @return 图像数据
     */
    @GetMapping("/thumbnail")
    public ResponseEntity<byte[]> getThumbnail(@RequestParam String imagePath) {
        try {
            System.out.println("请求缩略图路径: " + imagePath);
            
            // 安全检查：确保路径在允许的目录内
            if (!imagePath.contains("dataset_temp")) {
                System.out.println("路径安全检查失败: " + imagePath);
                return ResponseEntity.badRequest().build();
            }
            
            File file = new File(imagePath);
            System.out.println("文件绝对路径: " + file.getAbsolutePath());
            System.out.println("文件是否存在: " + file.exists());
            
            if (!file.exists()) {
                System.out.println("文件不存在: " + imagePath);
                return ResponseEntity.notFound().build();
            }
            
            // 读取原始图像
            BufferedImage originalImage = ImageIO.read(file);
            if (originalImage == null) {
                System.out.println("无法读取图像文件: " + imagePath);
                return ResponseEntity.badRequest().build();
            }
            
            System.out.println("原始图像尺寸: " + originalImage.getWidth() + "x" + originalImage.getHeight());
            
            // 生成缩略图（最大尺寸300x300，保持宽高比）
            BufferedImage thumbnail = createThumbnail(originalImage, 300, 300);
            System.out.println("缩略图尺寸: " + thumbnail.getWidth() + "x" + thumbnail.getHeight());
            
            // 将缩略图转换为字节数组
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(thumbnail, "JPEG", baos);
            byte[] imageBytes = baos.toByteArray();
            
            System.out.println("缩略图大小: " + imageBytes.length + " 字节");
            
            // 检测文件扩展名来确定Content-Type
            String fileName = file.getName().toLowerCase();
            String contentType = "image/jpeg"; // 默认为JPEG
            if (fileName.endsWith(".png")) {
                contentType = "image/png";
            } else if (fileName.endsWith(".gif")) {
                contentType = "image/gif";
            } else if (fileName.endsWith(".bmp")) {
                contentType = "image/bmp";
            } else if (fileName.endsWith(".webp")) {
                contentType = "image/webp";
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.parseMediaType(contentType));
            headers.setCacheControl("max-age=3600"); // 缓存1小时
            headers.setContentLength(imageBytes.length);
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(imageBytes);
        } catch (Exception e) {
            System.err.println("获取缩略图失败: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }
    
    /**
     * 创建缩略图
     * 
     * @param originalImage 原始图像
     * @param maxWidth 最大宽度
     * @param maxHeight 最大高度
     * @return 缩略图
     */
    private BufferedImage createThumbnail(BufferedImage originalImage, int maxWidth, int maxHeight) {
        int originalWidth = originalImage.getWidth();
        int originalHeight = originalImage.getHeight();
        
        // 计算缩放比例，保持宽高比
        double scaleX = (double) maxWidth / originalWidth;
        double scaleY = (double) maxHeight / originalHeight;
        double scale = Math.min(scaleX, scaleY);
        
        // 如果图像已经很小，不需要缩放
        if (scale >= 1.0) {
            return originalImage;
        }
        
        int newWidth = (int) (originalWidth * scale);
        int newHeight = (int) (originalHeight * scale);
        
        // 创建缩略图
        BufferedImage thumbnail = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = thumbnail.createGraphics();
        
        // 设置高质量渲染
        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        
        // 绘制缩放后的图像
        g2d.drawImage(originalImage, 0, 0, newWidth, newHeight, null);
        g2d.dispose();
        
        return thumbnail;
    }
} 