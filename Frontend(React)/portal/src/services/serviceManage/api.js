//引入自定义请求库，方便权限管理
import request from '@/utils/request';
// 获取服务列表
export async function reqServiceList(params) {
  return request('/wegismarkapi/server/getServers', {
    method: 'get',
    // data: params,
    skipErrorHandler: true,
  });
}

// 获取按影像集名称分组的服务列表
export async function reqServiceListBySetName() {
  return request('/wegismarkapi/server/getServersBySetName', {
    method: 'get',
    skipErrorHandler: true,
  });
}

// 删除服务
export async function reqDeleteService(id) {
  return request(`/wegismarkapi/server/deleteServer/${id}`, {
    method: 'delete',
    skipErrorHandler: true,
  });
}

// 获取服务缩略图
export async function reqGetServerThumbnail(serverName) {
  return request(`/wegismarkapi/server/thumbnail/${serverName}`, {
    method: 'get',
    responseType: 'blob', // 返回二进制数据
    skipErrorHandler: true,
  });
}

// 发布服务
export async function reqPublishTifServer(data) {
  return request('/wegismarkapi/server/createServer', {
    method: 'post',
    data,
    skipErrorHandler: true,
  });
}
// 测试后端Geoserver服务
export async function reqTestGeoserver() {
  return request('/wegismarkapi/geoserver', {
    method: 'get',
    skipErrorHandler: true,
    headers: {
      Authorization: 'Basic ' + Buffer.from('admin' + ':' + 'geoserver').toString('base64'),
    },
  });
}
// 测试Geoserver服务
export async function reqGetGeoServerInfo(name) {
  // return request('/api3/workspaces/LUU/coveragestores/hainan/coverages/hainan.json', {
  //   method: 'get',
  //   skipErrorHandler: true,
  //   headers: {
  //     Authorization: 'Basic ' + Buffer.from('admin' + ':' + 'geoserver').toString('base64'),
  //   },
  // });
  return request(`/api3/workspaces/LUU/coveragestores/${name}/coverages/${name}.json`, {
    method: 'get',
    skipErrorHandler: true,
    headers: {
      Authorization: 'Basic ' + Buffer.from('admin' + ':' + 'geoserver').toString('base64'),
    },
  });
}
//  /wegismarkapi/filePath
export async function reqGetFilePath(params) {
  return request('/wegismarkapi/files/getFilePath', {
    method: 'get',
    params,
    skipErrorHandler: true,
  });
}

// 创建服务对应的数据存储
export async function reqCreateDataStore(sername, path) {
  return request('/api3/workspaces/LUU/coveragestores', {
    method: 'post',
    data: {
      coverageStore: {
        name: sername,
        type: 'GeoTIFF',
        // type: 'WorldImage',
        // type: 'ImageMosaic',
        enabled: true,
        workspace: { name: 'LUU' },
        url: `file://${path}`,
      },
    },
    headers: {
      Authorization: 'Basic ' + Buffer.from('admin' + ':' + 'geoserver').toString('base64'),
    },
    skipErrorHandler: true,
  });
}

// 发布Geoserver服务
export async function reqTestGeoserver2(sername) {
  return request(`/api3/workspaces/LUU/coveragestores/${sername}/coverages`, {
    method: 'post',
    data: {
      coverage: {
        name: sername,
        nativename: sername,
        namespace: { name: 'LUU' },
        srs: 'EPSG:4326',
        store: { name: `LUU:${sername}`, '@class': 'coverageStore' },
        title: sername,
      },
    },
    // auth: { username: 'admin', password: 'geoserver' },
    headers: {
      Authorization: 'Basic ' + Buffer.from('admin' + ':' + 'geoserver').toString('base64'),
    },
    skipErrorHandler: true,
  });
}
//删除服务及所在的数据存储
export async function reqDelGeoserver(sername) {
  return request(`/api3/workspaces/LUU/coveragestores/${sername}?recurse=true`, {
    method: 'delete',
    // auth: { username: 'admin', password: 'geoserver' },
    headers: {
      Authorization: 'Basic ' + Buffer.from('admin' + ':' + 'geoserver').toString('base64'),
    },
    skipErrorHandler: true,
  });
}
// ('http://localhost:8080/geoserver/rest/workspaces/LUU/coveragestores/LUUdatastore/coverages.json');
