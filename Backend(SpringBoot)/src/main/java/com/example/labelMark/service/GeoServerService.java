package com.example.labelMark.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.HashMap;
import java.util.Map;

/**
 * @version 1.0
 * @description： 遥感影像切片服务类
 * @createDate 2024/4/17
 */
public interface GeoServerService {
    String getGeoserverInfo(String mapServer);

    ResponseEntity<byte[]> getGeoserverImg(String layerName, int width, int height, String bbox, String srs);
}
