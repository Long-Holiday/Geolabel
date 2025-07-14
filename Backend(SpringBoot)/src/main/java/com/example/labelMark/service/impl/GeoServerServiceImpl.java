package com.example.labelMark.service.impl;

import com.example.labelMark.service.GeoServerService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * @Description
 * 
 * @Date 2024/5/22
 */
@Service
public class GeoServerServiceImpl implements GeoServerService {

//    @Value("${geoserver.url}")
    private String geoserverUrl = "http://localhost:8081/geoserver";

    @Value("${geoserver.username}")
    private String username;

    @Value("${geoserver.password}")
    private String password;

    private RestTemplate restTemplate;

    public GeoServerServiceImpl(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    public String getGeoserverInfo(String mapServer) {
        String url = UriComponentsBuilder.fromHttpUrl(geoserverUrl)
                .pathSegment("rest", "workspaces", "LUU", "coveragestores", mapServer, "coverages", mapServer + ".json")
                .toUriString();

        HttpHeaders headers = new HttpHeaders();
        headers.setBasicAuth(username, password);

        ResponseEntity<String> response = restTemplate.getForEntity(url, String.class, headers);

        return response.getBody();
    }

    @Override
    public ResponseEntity<byte[]> getGeoserverImg(String layerName, int width, int height, String bbox, String srs) {
        try {
            String url = UriComponentsBuilder.fromHttpUrl(geoserverUrl)
                    .pathSegment("LUU", "wms")
                    .toUriString();

            Map<String, String> params = new HashMap<>();
            params.put("service", "WMS");
            params.put("version", "1.1.0");
            params.put("request", "GetMap");
            params.put("layers", "LUU:" + layerName);
            params.put("styles", "");
            params.put("bbox", bbox);
            params.put("width", String.valueOf(width));
            params.put("height", String.valueOf(height));
            params.put("srs", srs);
            params.put("format", "image/jpeg"); // 返回JPEG格式用于缩略图
            params.put("exceptions", "application/vnd.ogc.se_inimage");

            UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(url);
            params.forEach(builder::queryParam);

            String finalUrl = builder.toUriString();
            System.out.println("Final URL: " + finalUrl); // 打印出最终的 URL

            // 添加基本身份验证头
            HttpHeaders headers = new HttpHeaders();
            String auth = username + ":" + password;
            byte[] encodedAuth = Base64.getEncoder().encode(auth.getBytes());
            String authHeader = "Basic " + new String(encodedAuth);
            headers.set("Authorization", authHeader);

            HttpEntity<String> requestEntity = new HttpEntity<>(headers);

            // 发送请求并获取响应
            ResponseEntity<byte[]> response = restTemplate.exchange(finalUrl, HttpMethod.GET, requestEntity, byte[].class);

            // 打印响应状态码和头部信息
            System.out.println("Response Status Code: " + response.getStatusCode());
            System.out.println("Response Headers: " + response.getHeaders());

            // 返回响应体
            return response;
        } catch (HttpClientErrorException | HttpServerErrorException e) {
            e.printStackTrace();
            System.err.println("HTTP Status Code: " + e.getStatusCode());
            System.err.println("Response Body: " + e.getResponseBodyAsString());
            return ResponseEntity.status(e.getStatusCode()).body(null);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

}
