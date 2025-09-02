// 引入 umi 封装的请求库
// import { request } from 'umi';
//引入自定义请求库，方便权限管理
import request from '@/utils/request';

// 获取角色列表
export async function reqRoleList() {
  return request('/wegismarkapi/user/getRoles', {
    method: 'get',
  });
}

// 获取用户list
export async function reqGetUserList(params) {
  return request(`/wegismarkapi/user/getUsers`, {
    method: 'GET',
    params,
  });
}
// 新增用户
export async function reqNewUser(data) {
  return request('/wegismarkapi/user', {
    method: 'post',
    data,
  });
}

export async function reqDeleteUser(id) {
  return request(`/wegismarkapi/user/deleteUser/${id}`, {
    method: 'delete',
  });
}
// 编辑用户信息
export async function reqEditUser(params) {
  return request(`/wegismarkapi/user/updateUser`, {
    method: 'put',
    data: params,
  });
}
export async function reqResetPassword(params) {
  return request(`/wegismarkapi/user/resetPassword`, {
    method: 'post',
    data: params,
  });
}
