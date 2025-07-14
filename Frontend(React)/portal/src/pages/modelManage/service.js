import request from '@/utils/request';

/**
 * 获取所有模型列表
 */
export async function getAllModels() {
  return request('/wegismarkapi/model/list', {
    method: 'GET',
  });
}

/**
 * 根据用户ID获取模型列表
 * @param {number} userId
 */
export async function getModels(userId, taskType) {
  const params = {};
  if (taskType) {
    params.taskType = taskType;
  }
  
  return request(`/wegismarkapi/model/user/${userId}`, {
    method: 'GET',
    params,
  });
}

/**
 * 上传模型
 * @param {FormData} data
 */
export async function uploadModel(data) {
  return request('/wegismarkapi/model/upload', {
    method: 'POST',
    requestType: 'form',
    data,
    headers: {
      // 不设置Content-Type，让浏览器自动设置带boundary的multipart/form-data
      'Content-Type': undefined
    }
  });
}

/**
 * 删除模型
 * @param {number} modelId
 */
export async function deleteModel(modelId) {
  return request(`/wegismarkapi/model/${modelId}`, {
    method: 'DELETE',
  });
}

/**
 * 更新模型
 * @param {number} modelId
 * @param {object} data
 */
export async function updateModel(modelId, data) {
  return request(`/wegismarkapi/model/${modelId}`, {
    method: 'PUT',
    data,
  });
} 