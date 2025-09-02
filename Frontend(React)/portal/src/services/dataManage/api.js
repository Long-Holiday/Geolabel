import request from '@/utils/request';
// ----------矢量数据处理------------
export async function reqGetfileData(params) {
  return request('/wegismarkapi/files/getAllFiles', {
    method: 'get',
    params,
  });
}
// 上传tif文件
//'/wegismarkapi/uploadTif'
export async function reqUploadTifs(data) {
  return request('/wegismarkapi/files/uploadTif', {
    method: 'post',
    data,
    headers: {'Content-Type': 'multipart/form-data' },
  });
}
///wegismarkapi/uploadSuccess
export async function reqUploadSuccess(data) {
  return request('/wegismarkapi/files/mergeTif', {
    method: 'post',
    data,
  });
}

// 删
export async function reqDeleteFileData(name) {
  return request(`/wegismarkapi/files/deleteFile/${name}`, {
    method: 'delete',
  });
}
//改
export async function reqEditfileData(data) {
  return request(`/wegismarkapi/files/updateFile`, {
    method: 'put',
    data,
  });
}
// ----------栅格数据处理------------
export async function reqGetRasterData() {
  return request('/wegismarkapi/datas/tifs', {
    method: 'get',
    timeout: 4000,
  });
}
// 增
export async function reqPublishRasterData(data) {
  return request('/wegismarkapi/datas/tifs/publish', {
    method: 'post',
    data,
  });
}
// 删
export async function reqDeleteRasterData(name) {
  return request(`/wegismarkapi/datas/tifs/${name}`, {
    method: 'delete',
  });
}
//改
export async function reqEditRasterData(data) {
  return request(`/wegismarkapi/datas/tifs`, {
    method: 'put',
    data,
  });
}

// 批量发布影像服务
export async function reqPublishSet(data) {
  return request('/wegismarkapi/server/publishSet', {
    method: 'post',
    data,
  });
}

// ---------测试前端请求geoserver-------
export async function reqCreateWorkspaces(data) {
  return request('/api3/workspaces', {
    method: 'post',
    data,
    headers: {
      Authorization: 'Basic YWRtaW46Z2Vvc2VydmVy',
    },
  });
}
export async function reqGetWorkspaces() {
  return request('/api3/workspaces', {
    method: 'get',
    headers: {
      Authorization: 'Basic YWRtaW46Z2Vvc2VydmVy',
    },
  });
}
export async function reqGetDatastores(workspaces) {
  return request(`/api3/workspaces/${workspaces}/datastores`, {
    method: 'get',
    headers: {
      Authorization: 'Basic YWRtaW46Z2Vvc2VydmVy',
    },
  });
}
export async function reqCreateDatastores(workspaces, data) {
  return request(`/api3/workspaces/${workspaces}/datastores`, {
    method: 'post',
    data,
    headers: {
      Authorization: 'Basic YWRtaW46Z2Vvc2VydmVy',
    },
  });
}
export async function reqSendVectorData(info, option) {
  return request(`/api3/workspaces/${info.workspaces}/datastores/${info.datastores}/file.shp`, {
    method: 'put',
    params: {
      charset: 'UTF-8', //字符集
    },
    data: option,
    headers: {
      Authorization: 'Basic YWRtaW46Z2Vvc2VydmVy',
      'Content-Type': 'application/zip',
    },
  });
}
export async function reqGetLayers() {
  return request(`/api3/workspaces/LUU/coveragestores/LUUdatastore`, {
    method: 'get',
    headers: {
      Authorization: 'Basic YWRtaW46Z2Vvc2VydmVy',
    },
  });
}
