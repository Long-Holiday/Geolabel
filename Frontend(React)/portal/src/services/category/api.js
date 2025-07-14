// 引入 umi 封装的请求库
import request from '@/utils/request';
// 获取用户list
export async function reqGetCategoryList(params) {
  return request('/wegismarkapi/type/getTypePage', {
    method: 'GET',
    params: { ...params },
  });
}
export async function reqNewCategory(params) {
  return request('/wegismarkapi/type/createType', {
    method: 'post',
    data: params,
  });
}
export async function reqDeleteCategory(id) {
  return request(`/wegismarkapi/type/deleteType/${id}`, {
    method: 'delete',
  });
}
export async function reqEditCategory(params) {
  return request(`/wegismarkapi/type/updateType`, {
    method: 'put',
    data: params,
  });
}
