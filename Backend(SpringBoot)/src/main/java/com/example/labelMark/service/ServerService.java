package com.example.labelMark.service;

import com.example.labelMark.domain.Server;
import com.baomidou.mybatisplus.extension.service.IService;

import java.util.List;
import java.util.Map;

/**
 * <p>
 *  服务类
 * </p>
 *
 * 
 * @since 2024-05-16
 */
public interface ServerService extends IService<Server> {

    List<Server> getServers(Integer userId);

    int deleteServerByName(String serName);

    boolean createServer(Server server);
    
    /**
     * 按照影像集名称分组获取服务
     * @param userId 用户ID
     * @return Map<String, List<String>> 键为影像集名称，值为该影像集下的服务名称列表
     */
    Map<String, List<String>> getServersBySetName(Integer userId);
}
