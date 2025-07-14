//引入自定义请求库，方便权限管理
import request from '@/utils/request';
// 获取用户list
export async function reqGetTaskList(params = {}) {
  return request('/wegismarkapi/task/getTaskInfo', {
    method: 'GET',
    params,
  });
}
// 获取分配给当前用户的任务列表
export async function reqGetPersonalTaskList(params = {}) {
  return request('/wegismarkapi/task/getPersonalTaskList', {
    method: 'GET',
    params,
  });
}
// 新建任务
export async function reqNewTask(params) {
  console.log('发送新建任务请求：', params);
  const mapServer = params.mapserver;
  console.log(`创建底图服务为 ${mapServer} 的任务`);
  return request('/wegismarkapi/task/publishTask', {
    method: 'post',
    data: params,
  });
}
// 删除任务
export async function reqDeleteTask(id) {
  return request(`/wegismarkapi/task/deleteTask/${id}`, {
    method: 'delete',
  });
}
// 修改任务
export async function reqEditTask(params) {
  console.log('发送编辑任务请求：', params);
  return request('/wegismarkapi/task/updateTask', {
    method: 'put',
    data: params,
    skipErrorHandler: true,
  });
}
/*// 开始标注请求标注地图服务地图
export async function reqStartMark(id) {
  return request(`/wegismarkapi/task/${id}`, {
    method: 'get',
    skipErrorHandler: true,
    timeout: 6000,
  });
}*/

// 开始标注请求标注地图服务地图（专用于标注页面）
export async function reqStartMark(params = {}) {
  return request(`/wegismarkapi/task/getMarkTaskDetail`, {
    method: 'get',
    params,
    skipErrorHandler: true,
    timeout: 6000,
  });
}
//用户提交任务
export async function reqSubmitTask(data) {
  return request(`/wegismarkapi/task/submitTask`, {
    method: 'post',
    data,
    skipErrorHandler: true,
    timeout: 6000,
  });
}

// 批量训练任务
export async function reqBatchTrainTasks(params) {
  return request('/wegismarkapi/task/batchTrain', {
    method: 'POST',
    data: params,
    skipErrorHandler: true,
  });
}

// 批量推理任务
export async function reqBatchInferenceTasks(params) {
  return request('/wegismarkapi/task/batchInference', {
    method: 'POST',
    data: params,
    skipErrorHandler: true,
  });
}
