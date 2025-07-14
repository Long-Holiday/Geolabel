package com.example.labelMark.controller;
import com.example.labelMark.service.GeoServerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;

@RestController("/geoserver")
public class GeoServerController {

    @Resource
    private GeoServerService geoServerService;

    @GetMapping("/info/{mapServer}")
    public String getGeoserverInfo(@PathVariable String mapServer) {
        return geoServerService.getGeoserverInfo(mapServer);
    }

    @GetMapping("/img")
    public ResponseEntity<byte[]> getGeoserverImg(
            @RequestParam String layerName,
            @RequestParam int width,
            @RequestParam int height,
            @RequestParam String bbox,
            @RequestParam String srs) {
        return geoServerService.getGeoserverImg(layerName, width, height, bbox, srs);
    }
}
