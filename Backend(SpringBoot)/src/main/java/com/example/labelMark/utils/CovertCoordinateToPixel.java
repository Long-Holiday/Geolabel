package com.example.labelMark.utils;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.example.labelMark.service.TaskService;
import com.example.labelMark.service.TypeService;

import javax.annotation.Resource;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;


public class CovertCoordinateToPixel {

    private static TypeService typeService;

    public static void setTypeService(TypeService typeService) {
        CovertCoordinateToPixel.typeService = typeService;
    }

    // 将一组地理坐标转换为像素坐标，并生成相应的边界框和分割数组。
    public static List<Map<String, Object>> covertCoordinateToPixel(
            List<Map<String, Object>> arr,
            Map<String, Double> tifParams,
            Map<String, Double> dimensions) {

        if (typeService == null) {
            throw new IllegalStateException("TypeService has not been initialized.");
        }

        double tifMinx = tifParams.get("minx");
        double tifMaxy = tifParams.get("maxy");
        double serverHeight = tifParams.get("serverHeight");
        double serverWidth = tifParams.get("serverWidth");
        double width = dimensions.get("width");
        double height = dimensions.get("height");

        List<Map<String, Object>> bboxArr = new ArrayList<>();

        for (Map<String, Object> item : arr) {
            try {
                // 获取geom数据，可能是GeoJSON字符串、JSONObject或String格式的坐标点
                Object geomObj = item.get("geom");
                List<Double> resultArr = new ArrayList<>();
                List<Double> xArray = new ArrayList<>();
                List<Double> yArray = new ArrayList<>();
                
                // 处理不同格式的geom数据
                if (geomObj instanceof JSONObject) {
                    // 直接使用JSONObject
                    parseGeoJSON((JSONObject) geomObj, resultArr, xArray, yArray, tifMinx, tifMaxy, serverWidth, serverHeight, width, height);
                } else if (geomObj instanceof String) {
                    String geomStr = (String) geomObj;
                    // 尝试解析为GeoJSON
                    if (geomStr.trim().startsWith("{")) {
                        // 看起来是GeoJSON格式
                        JSONObject geoJSON = JSON.parseObject(geomStr);
                        parseGeoJSON(geoJSON, resultArr, xArray, yArray, tifMinx, tifMaxy, serverWidth, serverHeight, width, height);
                    } else {
                        // 按照原来的方式处理坐标点字符串
                        parseCoordinateString(geomStr, resultArr, xArray, yArray, tifMinx, tifMaxy, serverWidth, serverHeight, width, height);
                    }
                } else {
                    System.err.println("Unexpected geom type: " + (geomObj != null ? geomObj.getClass().getName() : "null"));
                    continue; // 跳过类型不支持的项
                }
                
                // 如果没有解析到坐标点，则跳过此项
                if (xArray.isEmpty() || yArray.isEmpty()) {
                    System.err.println("No coordinates parsed from geom data");
                    continue;
                }
                
                // 找到 xArray 和 yArray 中的最小值和最大值
                double minX = xArray.stream().min(Double::compare).orElse(0.0);
                double minY = yArray.stream().min(Double::compare).orElse(0.0);
                double maxX = xArray.stream().max(Double::compare).orElse(0.0);
                double maxY = yArray.stream().max(Double::compare).orElse(0.0);
                
                // 根据最小值和最大值计算像素坐标边界框
                double pixMinx = ((minX - tifMinx) / serverWidth) * width;
                double pixMiny = ((tifMaxy - minY) / serverHeight) * height;
                double pixMaxx = ((maxX - tifMinx) / serverWidth) * width;
                double pixMaxy = ((tifMaxy - maxY) / serverHeight) * height;
                
                // 构建结果
                Integer taskId = (Integer) item.get("taskId");
                Integer userId = (Integer) item.get("userId");
                Integer typeId = (Integer) item.get("typeId");
                String typeColor = typeService.getColorById((Integer) item.get("typeId"));
                
                Map<String, Object> bboxItem = new HashMap<>();
                bboxItem.put("geom", geomObj instanceof String ? geomObj : ((JSONObject) geomObj).toJSONString());
                bboxItem.put("task_id", taskId);
                bboxItem.put("user_id", userId);
                bboxItem.put("type_id", typeId);
                bboxItem.put("type_color", typeColor);
                bboxItem.put("segmentation", resultArr);
                bboxItem.put("bbox", new double[]{pixMinx, pixMaxy, pixMaxx - pixMinx, pixMiny - pixMaxy});
                bboxItem.put("geoBbox", String.format("%f,%f,%f,%f", minX, minY, maxX, maxY));
                
                bboxArr.add(bboxItem);
            } catch (Exception e) {
                System.err.println("Error processing item: " + e.getMessage());
                e.printStackTrace();
            }
        }

        return bboxArr;
    }

    // 解析GeoJSON格式
    private static void parseGeoJSON(JSONObject geoJSON, List<Double> resultArr, List<Double> xArray, List<Double> yArray, 
                                   double tifMinx, double tifMaxy, double serverWidth, double serverHeight, double width, double height) {
        try {
            // 获取geometry部分，可能直接是geometry对象或者是feature内包含geometry
            JSONObject geometry = geoJSON;
            
            // 检查是否是Feature类型
            if (geoJSON.containsKey("type") && "Feature".equals(geoJSON.getString("type"))) {
                geometry = geoJSON.getJSONObject("geometry");
            } else if (geoJSON.containsKey("features")) {
                // 如果是FeatureCollection，取第一个feature的geometry
                JSONArray features = geoJSON.getJSONArray("features");
                if (features.size() > 0) {
                    geometry = features.getJSONObject(0).getJSONObject("geometry");
                }
            }
            
            if (geometry == null) {
                System.err.println("No geometry found in GeoJSON");
                return;
            }
            
            String type = geometry.getString("type");
            JSONArray coordinates;
            
            switch (type) {
                case "Point":
                    coordinates = geometry.getJSONArray("coordinates");
                    addCoordinate(coordinates.getDoubleValue(0), coordinates.getDoubleValue(1), 
                                  resultArr, xArray, yArray, tifMinx, tifMaxy, serverWidth, serverHeight, width, height);
                    break;
                    
                case "LineString":
                    coordinates = geometry.getJSONArray("coordinates");
                    for (int i = 0; i < coordinates.size(); i++) {
                        JSONArray point = coordinates.getJSONArray(i);
                        addCoordinate(point.getDoubleValue(0), point.getDoubleValue(1), 
                                     resultArr, xArray, yArray, tifMinx, tifMaxy, serverWidth, serverHeight, width, height);
                    }
                    break;
                    
                case "Polygon":
                    coordinates = geometry.getJSONArray("coordinates");
                    // 取第一个环（外环）
                    JSONArray ring = coordinates.getJSONArray(0);
                    for (int i = 0; i < ring.size(); i++) {
                        JSONArray point = ring.getJSONArray(i);
                        addCoordinate(point.getDoubleValue(0), point.getDoubleValue(1), 
                                     resultArr, xArray, yArray, tifMinx, tifMaxy, serverWidth, serverHeight, width, height);
                    }
                    break;
                    
                case "MultiPolygon":
                    coordinates = geometry.getJSONArray("coordinates");
                    // 取第一个多边形的第一个环
                    JSONArray polygon = coordinates.getJSONArray(0);
                    ring = polygon.getJSONArray(0);
                    for (int i = 0; i < ring.size(); i++) {
                        JSONArray point = ring.getJSONArray(i);
                        addCoordinate(point.getDoubleValue(0), point.getDoubleValue(1), 
                                     resultArr, xArray, yArray, tifMinx, tifMaxy, serverWidth, serverHeight, width, height);
                    }
                    break;
                    
                default:
                    System.err.println("Unsupported geometry type: " + type);
            }
        } catch (Exception e) {
            System.err.println("Error parsing GeoJSON: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // 解析坐标点字符串
    private static void parseCoordinateString(String geomStr, List<Double> resultArr, List<Double> xArray, List<Double> yArray,
                                            double tifMinx, double tifMaxy, double serverWidth, double serverHeight, double width, double height) {
        String[] itemArr = geomStr.split(",");
        for (int i = 0; i < itemArr.length; i++) {
            if (i % 2 == 0) {
                double currentX = Double.parseDouble(itemArr[i]);
                resultArr.add(((currentX - tifMinx) / serverWidth) * width);
                xArray.add(currentX);
            } else {
                double currentY = Double.parseDouble(itemArr[i]);
                resultArr.add(((tifMaxy - currentY) / serverHeight) * height);
                yArray.add(currentY);
            }
        }
    }
    
    // 添加单个坐标点
    private static void addCoordinate(double x, double y, List<Double> resultArr, List<Double> xArray, List<Double> yArray,
                                    double tifMinx, double tifMaxy, double serverWidth, double serverHeight, double width, double height) {
        resultArr.add(((x - tifMinx) / serverWidth) * width);
        resultArr.add(((tifMaxy - y) / serverHeight) * height);
        xArray.add(x);
        yArray.add(y);
    }
}
