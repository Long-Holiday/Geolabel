// 引入 umi 封装的请求库
import { request } from 'umi';
// 新增机构
export async function reqNewOrg(params) {
  return request('/wegismarkapi/units', {
    method: 'POST',
    data: params,
  });
}

// 删除机构
export async function reqDeleteOrg(id) {
  return request(`/wegismarkapi/units/${id}`, {
    method: 'DELETE',
  });
}

// 获取机构数据列表
// 此处需要带上参数
export async function getOrgList(params, options) {
  return request('/wegismarkapi/units', {
    method: 'GET',
    params: { ...params },
    ...(options || {}),
  });
}
