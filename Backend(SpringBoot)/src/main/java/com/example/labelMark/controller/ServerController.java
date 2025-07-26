package com.example.labelMark.controller;

import com.example.labelMark.service.SysFileService;
import com.example.labelMark.vo.LoginUser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.json.JSONObject;

import com.example.labelMark.domain.Server;
import com.example.labelMark.domain.SysFile;
import com.example.labelMark.service.AsyncPublishService;
import com.example.labelMark.service.GeoServerService;
import com.example.labelMark.service.ServerService;
import com.example.labelMark.utils.GeoServerRESTClient;
import com.example.labelMark.utils.ResultGenerator;
import com.example.labelMark.vo.constant.Result;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;


import javax.annotation.Resource;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * <p>
 *  前端控制器
 * </p>
 *

 */
@RestController
@RequestMapping("/server")
public class ServerController {

    private static final String GEOSERVER_REST_URL = "http://localhost:8081/geoserver/rest";
    private static final String DOWNLOAD_DIR = "src/main/java/com/example/labelMark/resource/img"; // 指定下载目录

    private static final String USERNAME = "admin";
    private static final String PASSWORD = "geoserver";
    @Resource
    private ServerService serverService;
    @Resource
    private SysFileService sysFileService;
    @Resource
    private AsyncPublishService asyncPublishService;

    @Resource
    private GeoServerRESTClient geoServerRESTClient;
    
    @Resource
    private GeoServerService geoServerService;

    @GetMapping("/getServers")
    public Result getServers() {
        // 获取当前登录用户
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        // 从Authentication中获取LoginUser对象
        LoginUser loginUser = (LoginUser) authentication.getPrincipal();
        // 获取用户ID
        Integer userId = loginUser.getSysUser().getUserid();
        
        // 用当前用户ID查询服务列表
        List<Server> servers = serverService.getServers(userId);
        return ResultGenerator.getSuccessResult(servers);
    }

    @GetMapping("/getServersBySetName")
    public Result getServersBySetName() {
        // 获取当前登录用户
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        // 从Authentication中获取LoginUser对象
        LoginUser loginUser = (LoginUser) authentication.getPrincipal();
        // 获取用户ID
        Integer userId = loginUser.getSysUser().getUserid();
        
        // 用当前用户ID查询按影像集分组的服务列表
        Map<String, List<String>> serversBySetName = serverService.getServersBySetName(userId);
        return ResultGenerator.getSuccessResult(serversBySetName);
    }

    @DeleteMapping("/deleteServer/{serName}")
    public Result deleteServerByName(@PathVariable String serName) {
        try {
            int isDelete = serverService.deleteServerByName(serName);
            if (isDelete < 0) {
                return ResultGenerator.getFailResult("删除失败");
            }
            return ResultGenerator.getSuccessResult("删除成功");
        } catch (Exception e) {
            return ResultGenerator.getFailResult("删除失败" + e.getMessage());
        }
    }


    @PostMapping("/createServer")
    public Result createServer(@RequestBody Map<String, Object> map) {
        try {
            String filename = map.get("filename").toString();
            String publisher = map.get("publisher").toString();
            String publishtime = map.get("publishtime").toString();
            String serdesc = map.get("serdesc").toString();
            String sername = map.get("sername").toString();
            String seryear = map.get("seryear").toString();
            String publishUrl = map.get("publishUrl").toString();
            
            // 获取当前登录用户
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            // 从Authentication中获取LoginUser对象
            LoginUser loginUser = (LoginUser) authentication.getPrincipal();
            // 获取用户ID
            Integer userId = loginUser.getSysUser().getUserid();
            
            //创建服务
            Server server = new Server();
            server.setPublishUrl(publishUrl);
            server.setPublisher(publisher);
            server.setPublishTime(publishtime);
            server.setSerDesc(serdesc);
            server.setSerYear(seryear);
            server.setSerName(sername);
            server.setUserId(userId); // 设置用户ID
            
            // 获取文件的影像集名称
            SysFile sysFile = sysFileService.getFileByFileName(filename);
            if (sysFile != null && sysFile.getSetName() != null) {
                server.setSetName(sysFile.getSetName());
            }
            
            boolean isInserted = serverService.createServer(server);
            if (isInserted) {
//                TODO 使用fileId来唯一限定
                //            更新服务状态为已发布
                sysFileService.updateFileStatus(filename);
                return ResultGenerator.getSuccessResult("创建服务成功");
            } else {
                return ResultGenerator.getFailResult("创建服务失败");
            }
        }catch (Exception e){
            return ResultGenerator.getFailResult("创建失败"+ e.getMessage());
        }
    }
    
    @PostMapping("/publishSet")
    public Result publishSet(@RequestBody Map<String, Object> map) {
        try {
            // 获取文件ID列表
            List<Integer> fileIds = (List<Integer>) map.get("fileIds");
            if (fileIds == null || fileIds.isEmpty()) {
                return ResultGenerator.getFailResult("请选择要发布的文件");
            }
            
            // 获取服务描述等信息
            String serdesc = map.containsKey("serdesc") ? map.get("serdesc").toString() : "批量发布的服务";
            String seryear = map.containsKey("seryear") ? map.get("seryear").toString() : String.valueOf(java.time.Year.now().getValue());
            String publisher = map.containsKey("publisher") ? map.get("publisher").toString() : "系统";
            String publishtime = map.containsKey("publishtime") ? map.get("publishtime").toString() : 
                java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            
            // 获取当前登录用户
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            LoginUser loginUser = (LoginUser) authentication.getPrincipal();
            Integer userId = loginUser.getSysUser().getUserid();
            
            // 异步处理每个文件的发布
            for (Integer fileId : fileIds) {
                asyncPublishService.publishSingleImageToGeoServer(fileId, userId, serdesc, seryear, publisher, publishtime);
            }
            
            return ResultGenerator.getSuccessResult("发布任务已提交，正在后台处理");
        } catch (Exception e) {
            return ResultGenerator.getFailResult("提交发布任务失败: " + e.getMessage());
        }
    }

    @GetMapping ("/downloadServerImg")
    public Result downloadServerImg(String serverName) throws IOException {

            // 获取图层信息
            String layerInfo = geoServerRESTClient.getLayerInfo(serverName);

            // 使用 Jackson 解析 JSON 响应
            ObjectMapper objectMapper = new ObjectMapper();
            JsonNode rootNode = objectMapper.readTree(layerInfo);
            String coverageHref = rootNode.path("layer").path("resource").path("href").asText();

            String auth = USERNAME + ":" + PASSWORD;
            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes());

            URL url = new URL(coverageHref);
            HttpURLConnection con = (HttpURLConnection) url.openConnection();
            con.setRequestMethod("GET");
            con.setRequestProperty("Authorization", "Basic " + encodedAuth);

            int responseCode = con.getResponseCode();
            if (responseCode == HttpURLConnection.HTTP_OK) {
                BufferedInputStream in = new BufferedInputStream(con.getInputStream());
                OutputStream out = new FileOutputStream(String.valueOf(Paths.get(DOWNLOAD_DIR, serverName + ".tiff")));

                byte[] buffer = new byte[1024];
                int bytesRead;
                while ((bytesRead = in.read(buffer, 0, 1024)) != -1) {
                    out.write(buffer, 0, bytesRead);
                }

                in.close();
                out.close();

                return ResultGenerator.getSuccessResult("TIFF file successfully downloaded");
            } else {
                return ResultGenerator.getFailResult("GET request not worked. Response code: " + responseCode);
            }
    }

    private String getBasicAuthToken() {
        String auth = USERNAME + ":" + PASSWORD;
        String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));
        return "Basic " + encodedAuth;
    }

    private HttpRequest buildRequest(String path, MultiValueMap<String, String> queryParams) {
        String encodedPath = URLEncoder.encode(path, StandardCharsets.UTF_8);
        return HttpRequest.newBuilder()
                .uri(URI.create(GEOSERVER_REST_URL + "/" + encodedPath))
                .headers("Authorization", "Basic " + getBasicAuthToken())
                .GET()
                .build();
    }

    @GetMapping("/thumbnail/{serverName}")
    public ResponseEntity<byte[]> getServerThumbnail(@PathVariable String serverName) {
        try {
            // 获取图层信息
            String layerInfo = geoServerRESTClient.getLayerInfo(serverName);
            if (layerInfo.startsWith("ERROR") || layerInfo.startsWith("GET request not worked")) {
                return ResponseEntity.notFound().build();
            }

            // 使用 Jackson 解析 JSON 响应
            ObjectMapper objectMapper = new ObjectMapper();
            JsonNode rootNode = objectMapper.readTree(layerInfo);
            String coverageHref = rootNode.path("layer").path("resource").path("href").asText();

            // 获取 coverage 详细信息
            String coverageInfo = geoServerRESTClient.getCoverageInfo(coverageHref);
            if (coverageInfo.startsWith("ERROR")) {
                return ResponseEntity.notFound().build();
            }

            // 解析 coverage 信息
            JsonNode coverageRootNode = objectMapper.readTree(coverageInfo);
            String srs = coverageRootNode.path("coverage").path("srs").asText();

            // 获取边界框信息
            JsonNode bboxNode = coverageRootNode.path("coverage").path("nativeBoundingBox");
            double minx = bboxNode.path("minx").asDouble();
            double maxx = bboxNode.path("maxx").asDouble();
            double miny = bboxNode.path("miny").asDouble();
            double maxy = bboxNode.path("maxy").asDouble();

            // 计算缩略图尺寸，保持宽高比
            double height = 300; // 缩略图高度
            double width = Math.ceil(((maxx - minx) / (maxy - miny)) * height);
            
            // 限制最大宽度
            if (width > 400) {
                width = 400;
                height = Math.ceil(((maxy - miny) / (maxx - minx)) * width);
            }

            String bbox = String.format("%f,%f,%f,%f", minx, miny, maxx, maxy);

            // 调用GeoServer服务获取影像
            ResponseEntity<byte[]> result = geoServerService.getGeoserverImg(
                    serverName,
                    (int) Math.round(width),
                    (int) Math.round(height),
                    bbox,
                    srs
            );

            if (result.getStatusCode().is2xxSuccessful() && result.getBody() != null) {
                // 设置响应头
                HttpHeaders headers = new HttpHeaders();
                headers.set("Content-Type", "image/jpeg");
                headers.set("Cache-Control", "max-age=3600"); // 缓存1小时
                
                return new ResponseEntity<>(result.getBody(), headers, HttpStatus.OK);
            } else {
                return ResponseEntity.notFound().build();
            }

        } catch (Exception e) {
            System.err.println("获取服务缩略图失败: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
