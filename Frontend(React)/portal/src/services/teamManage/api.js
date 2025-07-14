// 引入自定义请求库
import request from '@/utils/request';

/**
 * 创建团队
 * @param {Object} data 包含团队名称的对象 {teamName: string}
 * @returns {Promise} 创建结果
 */
export async function reqCreateTeam(data) {
  return request('/wegismarkapi/team/create', {
    method: 'POST',
    data,
  });
}

/**
 * 获取当前管理员的团队码
 * @returns {Promise} 团队码信息
 */
export async function reqGetMyTeamCode() {
  return request('/wegismarkapi/team/getMyTeamCode', {
    method: 'GET',
  });
}

/**
 * 加入团队
 * @param {Object} data 包含团队码的对象 {teamCode: string}
 * @returns {Promise} 加入结果
 */
export async function reqJoinTeam(data) {
  return request('/wegismarkapi/team/join', {
    method: 'POST',
    data,
  });
}

/**
 * 获取当前用户详细信息
 * @returns {Promise} 用户详细信息，包括团队信息
 */
export async function reqGetCurrentUserInfo() {
  return request('/wegismarkapi/user/currentState', {
    method: 'GET',
  });
} 