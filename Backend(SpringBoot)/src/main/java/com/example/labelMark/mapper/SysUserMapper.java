package com.example.labelMark.mapper;

import com.example.labelMark.domain.SysUser;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

/**
 * <p>
 * Mapper 接口
 * </p>
 *
 * 
 * @since 2024-04-15
 */
@Mapper
public interface SysUserMapper extends BaseMapper<SysUser> {
    @Override
    int insert(SysUser user);
    
    /**
     * 更新用户的团队ID
     * @param userId 用户ID
     * @param teamId 团队ID
     * @return 更新结果
     */
    @Update("UPDATE sys_user SET team_id = #{teamId} WHERE user_id = #{userId}")
    int updateUserTeamId(@Param("userId") Integer userId, @Param("teamId") Integer teamId);
}
