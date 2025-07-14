package com.example.labelMark.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.example.labelMark.domain.Server;
import com.example.labelMark.domain.SysUser;
import com.example.labelMark.mapper.ServerMapper;
import com.example.labelMark.mapper.SysUserMapper;
import com.example.labelMark.service.GeoServerService;
import com.example.labelMark.service.ServerService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * <p>
 *  服务实现类
 * </p>
 *
 * 
 * @since 2024-04-15
 */
@Service
public class ServerServiceImpl extends ServiceImpl<ServerMapper, Server> implements ServerService {

    @Resource
    private ServerMapper serverMapper;
    
    @Resource
    private SysUserMapper sysUserMapper;

    @Override
    public List<Server> getServers(Integer userId) {
        if (userId == null) {
            // 如果没有提供userId，返回空列表
            return List.of();
        }
        
        // 先查询用户信息，确定是否是管理员
        // SysUser user = sysUserMapper.selectById(userId);
        // if (user != null && user.getIsadmin() == 1) {
        //     // 管理员可以查看所有服务
        //     return serverMapper.selectList(null);
        // }
        
        // 非管理员用户只能查看自己创建的服务
        QueryWrapper<Server> wrapper = new QueryWrapper<>();
        wrapper.eq("user_id", userId);
        
        return serverMapper.selectList(wrapper);
    }

    @Override
    public int deleteServerByName(String serName) {
        QueryWrapper<Server> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("ser_name", serName);
        int delete = serverMapper.delete(queryWrapper);
        return delete;
    }

    @Override
    public boolean createServer(Server server) {
        boolean save = save(server);
        return save;
    }
    
    @Override
    public Map<String, List<String>> getServersBySetName(Integer userId) {
        // 首先获取用户的所有服务
        List<Server> servers = getServers(userId);
        
        // 按照set_name分组，对于每个set_name，收集服务名称列表
        Map<String, List<String>> result = new HashMap<>();
        
        // 分组处理，创建影像集名称到服务名称列表的映射
        for (Server server : servers) {
            String setName = server.getSetName();
            // 如果set_name为空，或为null，则分到"未分组"类别
            if (setName == null || setName.trim().isEmpty()) {
                setName = "未分组";
            }
            
            // 如果map中没有这个key，则创建新的list
            if (!result.containsKey(setName)) {
                result.put(setName, new ArrayList<>());
            }
            
            // 把服务名称加入到对应的列表中
            result.get(setName).add(server.getSerName());
        }
        
        return result;
    }
}
