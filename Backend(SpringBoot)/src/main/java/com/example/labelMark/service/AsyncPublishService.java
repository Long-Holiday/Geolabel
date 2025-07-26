package com.example.labelMark.service;

/**
 * 异步发布服务接口
 */
public interface AsyncPublishService {
    
    /**
     * 异步发布单个影像到GeoServer
     * @param fileId 文件ID
     * @param userId 用户ID
     * @param serdesc 服务描述
     * @param seryear 服务年份
     * @param publisher 发布人
     * @param publishtime 发布时间
     */
    void publishSingleImageToGeoServer(Integer fileId, Integer userId, String serdesc, String seryear, String publisher, String publishtime);
} 