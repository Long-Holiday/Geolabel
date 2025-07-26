package com.example.labelMark.service.impl;

import com.example.labelMark.domain.Server;
import com.example.labelMark.domain.SysFile;
import com.example.labelMark.service.AsyncPublishService;
import com.example.labelMark.service.ServerService;
import com.example.labelMark.service.SysFileService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;

/**
 * 异步发布服务实现类
 */
@Service
public class AsyncPublishServiceImpl implements AsyncPublishService {
    
    private static final Logger logger = LoggerFactory.getLogger(AsyncPublishServiceImpl.class);
    private static final String GEOSERVER_REST_URL = "http://localhost:8081/geoserver/rest";
    private static final String USERNAME = "admin";
    private static final String PASSWORD = "geoserver";
    private static final String UPLOAD_DIR = System.getProperty("user.dir") + "/src/main/java/com/example/labelMark/resource/output";
    
    @Resource
    private SysFileService sysFileService;
    
    @Resource
    private ServerService serverService;
    
    @Async
    @Override
    public void publishSingleImageToGeoServer(Integer fileId, Integer userId, String serdesc, String seryear, String publisher, String publishtime) {
        try {
            // 根据fileId获取文件信息
            SysFile file = sysFileService.getFileById(fileId);
            if (file == null) {
                logger.error("文件不存在，fileId: {}", fileId);
                return;
            }
            
            // 文件已发布，跳过
            if (file.getStatus() != null && file.getStatus() == 1) {
                logger.info("文件已发布，跳过，fileName: {}", file.getFileName());
                return;
            }
            
            String fileName = file.getFileName();
            String serName = fileName.split("\\.")[0]; // 去掉扩展名作为服务名
            
            // 获取文件路径
            String filePath = Paths.get(UPLOAD_DIR, fileName).toString().replace("\\", "/");
            
            // 1. 创建GeoServer数据存储
            boolean storeCreated = createGeoServerStore(serName, filePath);
            if (!storeCreated) {
                logger.error("创建GeoServer数据存储失败，fileName: {}", fileName);
                return;
            }
            
            // 2. 发布GeoServer服务
            boolean servicePublished = publishGeoServerService(serName);
            if (!servicePublished) {
                logger.error("发布GeoServer服务失败，fileName: {}", fileName);
                return;
            }
            
            // 3. 记录服务信息到数据库
            String publishUrl = "http://localhost:8081/geoserver/rest/workspaces/LUU/coveragestores/" + serName + "/coverages";
            
            Server server = new Server();
            server.setSerName(serName);
            server.setSerDesc(serdesc);
            server.setSerYear(seryear);
            server.setPublisher(publisher);
            server.setPublishTime(publishtime);
            server.setPublishUrl(publishUrl);
            server.setUserId(userId);
            server.setSetName(file.getSetName());
            
            boolean isInserted = serverService.createServer(server);
            if (!isInserted) {
                logger.error("创建服务记录失败，fileName: {}", fileName);
                return;
            }
            
            // 4. 更新文件状态为已发布
            sysFileService.updateFileStatus(fileName);
            
            logger.info("文件发布成功，fileName: {}", fileName);
        } catch (Exception e) {
            logger.error("发布服务异常，fileId: {}, error: {}", fileId, e.getMessage(), e);
        }
    }
    
    /**
     * 创建GeoServer数据存储
     */
    private boolean createGeoServerStore(String storeName, String filePath) throws IOException, InterruptedException {
        String url = GEOSERVER_REST_URL + "/workspaces/LUU/coveragestores";
        
        String jsonBody = String.format(
                "{\n" +
                "  \"coverageStore\": {\n" +
                "    \"name\": \"%s\",\n" +
                "    \"type\": \"GeoTIFF\",\n" +
                "    \"enabled\": true,\n" +
                "    \"workspace\": { \"name\": \"LUU\" },\n" +
                "    \"url\": \"file:%s\"\n" +
                "  }\n" +
                "}", storeName, filePath);
        
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .header("Authorization", "Basic " + getBasicAuthToken())
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();
        
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        
        return response.statusCode() >= 200 && response.statusCode() < 300;
    }
    
    /**
     * 发布GeoServer服务
     */
    private boolean publishGeoServerService(String coverageName) throws IOException, InterruptedException {
        String url = GEOSERVER_REST_URL + "/workspaces/LUU/coveragestores/" + coverageName + "/coverages";
        
        String jsonBody = String.format(
                "{\n" +
                "  \"coverage\": {\n" +
                "    \"name\": \"%s\",\n" +
                "    \"nativename\": \"%s\",\n" +
                "    \"namespace\": { \"name\": \"LUU\" },\n" +
                "    \"srs\": \"EPSG:4326\",\n" +
                "    \"store\": { \"name\": \"LUU:%s\", \"@class\": \"coverageStore\" },\n" +
                "    \"title\": \"%s\"\n" +
                "  }\n" +
                "}", coverageName, coverageName, coverageName, coverageName);
        
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .header("Authorization", "Basic " + getBasicAuthToken())
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();
        
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        
        return response.statusCode() >= 200 && response.statusCode() < 300;
    }
    
    private String getBasicAuthToken() {
        String auth = USERNAME + ":" + PASSWORD;
        return Base64.getEncoder().encodeToString(auth.getBytes());
    }
} 