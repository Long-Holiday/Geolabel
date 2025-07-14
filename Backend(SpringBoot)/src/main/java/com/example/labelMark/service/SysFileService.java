package com.example.labelMark.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.example.labelMark.domain.SysFile;

import java.util.List;

/**
 * <p>
 * 服务类
 * </p>
 *
 * 
 * @since 2024-05-16
 */
public interface SysFileService extends IService<SysFile> {

    List<SysFile> getAllFiles(Integer current, Integer pageSize, Integer fileId, Integer userId, String setName);

    void updateFile(Integer fileId, String fileName, String updateTime);

    void deleteFile(String fileName);

    void createFile(String fileName, String updateTime, String size, Integer userId, String setName);

    boolean updateFileStatus(String fileName);
    
    SysFile getFileByFileName(String fileName);
    
    SysFile getFileById(Integer fileId);
}
