import request from '@/utils/request';
// 获取样本集
export async function reqGetDataset(params) {
  return request('/wegismarkapi/datasetStore/getDataSet', {
    method: 'get',
    params,
    skipErrorHandler: true,
  });
}
// 获取样本图片
export async function reqGetDatasetImg(params) {
  return request(`/wegismarkapi/datasetStore/findImgSrcTypeNameBySampleId`, {
    method: 'get',
    params,
    skipErrorHandler: true,
  });
}
// 设置公开
export async function reqSetDatasetStatus(data) {
  return request(`/wegismarkapi/datasetStore/setDatasetStatus`, {
    method: 'post',
    data,
    skipErrorHandler: true,
  });
}
// 删除
export async function reqDelDataset(params) {
  return request(`/wegismarkapi/datasetStore/delDataSet`, {
    method: 'get',
    params,
    skipErrorHandler: true,
  });
}
// 下载
export async function reqDownload(params) {
  return request(`/wegismarkapi/datasetStore/download`, {
    method: 'get',
    params,
    skipErrorHandler: true,
    // responseType: 'blob',
  });
}

// 下载多个样本作为COCO数据集
export async function reqDownloadMultiple(data) {
  return request(`/wegismarkapi/datasetStore/downloadMultiple`, {
    method: 'post',
    data,
    skipErrorHandler: true,
    // responseType: 'blob',
  });
}

// 发布共享数据集
export async function reqPublishSharedDataset(data) {
  return request(`/wegismarkapi/dataset/publishSharedDataset`, {
    method: 'post',
    data,
    skipErrorHandler: true,
  });
}

// 获取共享数据集列表
export async function reqGetSharedDatasets(params) {
  return request(`/wegismarkapi/dataset/findDatasetByUserId`, {
    method: 'get',
    params,
    skipErrorHandler: true,
  });
}

// 下载共享数据集
export async function reqDownloadSharedDataset(params) {
  return request(`/wegismarkapi/datasetStore/downloadBySampleIds`, {
    method: 'post',
    data: params,
    skipErrorHandler: true,
    // responseType: 'blob',
  });
}

// 获取所有共享数据集列表
export async function reqGetAllSharedDatasets() {
  return request(`/wegismarkapi/dataset/findAllDatasets`, {
    method: 'get',
    skipErrorHandler: true,
  });
}

// 兑换共享数据集
export async function reqExchangeSharedDataset(params) {
  return request(`/wegismarkapi/datasetStore/exchangeBySampleIds`, {
    method: 'post',
    data: params,
    skipErrorHandler: true,
  });
}

// 获取用户已兑换的数据集
export async function reqGetMyDatasets() {
  return request(`/wegismarkapi/datasetStore/getMyDatasets`, {
    method: 'get',
    skipErrorHandler: true,
  });
}

// 下载已兑换的数据集
export async function reqDownloadMyDatasets(params) {
  return request(`/wegismarkapi/datasetStore/downloadMyDatasets`, {
    method: 'post',
    data: params,
    skipErrorHandler: true,
  });
}
