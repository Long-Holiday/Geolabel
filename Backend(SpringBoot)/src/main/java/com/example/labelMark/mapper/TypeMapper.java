package com.example.labelMark.mapper;

import com.example.labelMark.domain.Type;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.*;

import java.util.List;

/**
* @description 针对表【type】的数据库操作Mapper
* @createDate 2024-04-13 19:46:27
* @Entity com.example.labelMark.domain.Type
*/
@Mapper
public interface TypeMapper extends BaseMapper<Type> {
     @Select({
             "<script>",
             "SELECT * FROM type",
             "<where>",
             "<if test='typeId != null'>",
             "AND type_id = #{typeId}",
             "</if>",
             "<if test='typeName != null'>",
             "AND type_name like concat('%',#{typeName},'%')",
             "</if>",
             "</where>",
             "ORDER BY type_id ASC",
             "LIMIT #{pageSize} OFFSET #{offset}",
             "</script>"
     })
     List<Type> getTypes(@Param("current") Integer current,
                         @Param("pageSize") Integer pageSize,
                         @Param("typeId") Integer typeId,
                         @Param("typeName") String typeName,
                         @Param("offset") Integer offset);

     @Select("select type_id from type")
     List<Integer> getId();

     @Insert("insert into type(type_id, type_name, type_color) values (#{typeId}, #{typeName}, #{typeColor})")
     void createType(Integer typeId, String typeName, String typeColor);

     @Update("update type set type_name=#{typeName}, type_color=#{typeColor} where type_id=#{typeId}")
     void updateType(Type type);

     @Delete("delete from type where type_id=#{typeId}")
     void deleteTypeById(Integer typeId);

     @Select("SELECT * FROM type WHERE type_id = #{typeId}")
     Type getTypeById(Integer typeId);

     @Select("SELECT type_name FROM type WHERE type_id = #{typeId}")
     String getTypeNameById(Integer typeId);

     @Select("SELECT type_color FROM type WHERE type_id = #{typeId}")
     String getColorById(Integer typeId);
}




