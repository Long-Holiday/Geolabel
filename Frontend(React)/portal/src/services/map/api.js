import { request } from 'umi';
// 保存地图服务
//   /wegismarkapi/save
export async function reqSaveService(data) {
  return request('/wegismarkapi/mark/saveMarkInfo', {
    method: 'POST',
    data,
    skipErrorHandler: true,
  });
}
// 审核任务
export async function reqAuditTask(data) {
  return request('/wegismarkapi/task/auditTask', {
    method: 'POST',
    data,
    skipErrorHandler: true,
  });
}
// 生成样本
export async function reqGenerateDataset(data) {
  return request('/wegismarkapi/datasetStore/generateDataset', {
    method: 'POST',
    data,
    skipErrorHandler: true,
  });
}
export async function reqExportService(data) {
  return request('/wegismarkapi/maps/export', {
    method: 'POST',
    data,
    responseType: 'blob',
    skipErrorHandler: true,
  });
}

export async function reqUploadShp(body) {
  return request('/wegismarkapi/maps/upload', {
    method: 'POST',
    data: body,
    /* headers: {
      'Content-Type': 'multipart/form-data'
    }, */
  });
}
// 辅助功能
export async function reqAssistFunction(params) {
  return request('/wegismarkapi/mark/assistFunction', {
    method: 'POST',
    data:params,
    skipErrorHandler: true,
  });
}
// 模型推理
export async function reqInferenceFunction(params) {
  return request('/wegismarkapi/mark/inferenceFunction', {
    method: 'POST',
    data:params,
    skipErrorHandler: true,
  });
}
export async function reqGetModelList(params) {
  return request('/wegismarkapi/mark/getModelList', {
    method: 'POST',
    data:params,
    skipErrorHandler: true,
  });
}
//更新样本
export async function reqUqdateLabel(params) {
  return request('/wegismarkapi/mark/update_label', {
    method: 'POST',
    data:params,
    skipErrorHandler: true,
  });
}
// 获取标注任务详情 - 专用于标注页面
export async function reqGetMarkTaskDetail(params) {
  return request('/wegismarkapi/task/getMarkTaskDetail', {
    method: 'get',
    params,
    skipErrorHandler: true,
  });
}
