package com.example.labelMark.mapper;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.labelMark.domain.Server;
import com.example.labelMark.domain.SysFile;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

/**
 * <p>
 *  Mapper 接口
 * </p>
 *
 * 
 * @since 2024-04-18
 */
@Mapper
public interface SysFileMapper extends BaseMapper<SysFile> {

    @Select({
            "<script>",
            "SELECT * FROM file",
            "ORDER BY file_id DESC",
            "LIMIT #{pageSize} OFFSET #{offset}",
            "</script>"
    })
    List<SysFile> getAllFiles(Integer current, Integer pageSize, Integer fileId, int offset);
    
    @Select({
            "<script>",
            "SELECT * FROM file",
            "WHERE user_id = #{userId}",
            "<if test='setName != null and setName != \"\"'>",
            "AND set_name = #{setName}",
            "</if>",
            "ORDER BY file_id DESC",
            "LIMIT #{pageSize} OFFSET #{offset}",
            "</script>"
    })
    List<SysFile> getFilesByUserId(Integer current, Integer pageSize, Integer fileId, int offset, Integer userId, String setName);

    @Update("update SysFile set file_name=#{fileName}, update_time=#{updateTime} where file_id=#{fileId}")
    void updateFile(Integer fileId, String fileName, String updateTime);


    @Insert("INSERT INTO file(file_name, update_time, status, size, user_id, set_name) values (#{fileName}, #{updateTime}, 0, #{size}, #{userId}, #{setName})")
    void createFile(String fileName, String updateTime, String size, Integer userId, String setName);
}
