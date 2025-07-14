package com.example.labelMark.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.example.labelMark.domain.SysFile;
import com.example.labelMark.domain.SysUser;
import com.example.labelMark.mapper.SysFileMapper;
import com.example.labelMark.mapper.SysUserMapper;
import com.example.labelMark.service.SysFileService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.List;

/**
 * <p>
 * 服务实现类
 * </p>
 *
 * 
 * @since 2024-04-18
 */
@Service
public class SysFileServiceImpl extends ServiceImpl<SysFileMapper, SysFile> implements SysFileService {

    @Resource
    private SysFileMapper sysfileMapper;
    
    @Resource
    private SysUserMapper sysUserMapper;

    @Override
    public List<SysFile> getAllFiles(Integer current, Integer pageSize, Integer fileId, Integer userId, String setName) {
        int offset = pageSize * (current - 1);
        
        // // 先查询用户信息，确定是否是管理员
        // SysUser user = sysUserMapper.selectById(userId);
        
        // // 如果是管理员，返回所有文件
        // if (user != null && user.getIsadmin() == 1) {
        //     return sysfileMapper.getAllFiles(current, pageSize, fileId, offset);
        // }
        
        // 如果是普通用户，只返回自己上传的文件
        return sysfileMapper.getFilesByUserId(current, pageSize, fileId, offset, userId, setName);
    }

    @Override
    public void updateFile(Integer fileId, String fileName, String updateTime) {
        sysfileMapper.updateFile(fileId, fileName, updateTime);
    }

    @Override
    public void deleteFile(String fileName) {
        QueryWrapper<SysFile> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("file_name", fileName);
        sysfileMapper.delete(queryWrapper);

    }

    @Override
    public void createFile(String fileName, String updateTime, String size, Integer userId, String setName) {
        sysfileMapper.createFile(fileName, updateTime, size, userId, setName);
    }

    @Override
    public boolean updateFileStatus(String fileName) {
        UpdateWrapper<SysFile> wrapper = new UpdateWrapper<>();
        wrapper.eq("file_name", fileName).set("status", 1);
        boolean update = update(null, wrapper);
        return update;
    }
    
    @Override
    public SysFile getFileByFileName(String fileName) {
        QueryWrapper<SysFile> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("file_name", fileName);
        return sysfileMapper.selectOne(queryWrapper);
    }
    
    @Override
    public SysFile getFileById(Integer fileId) {
        return sysfileMapper.selectById(fileId);
    }
}
