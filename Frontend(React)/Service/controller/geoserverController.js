const request = require("../utils/request");

const getGeoserverInfo = (mapserver) =>
  request.get(
    `/rest/workspaces/LUU/coveragestores/${mapserver}/coverages/${mapserver}.json`,
    {
      auth: {
        username: "admin",
        password: "geoserver",
      },
    }
  );

// 定义一个函数，该函数接受图层名称、宽度、高度、边界框和空间参考系统作为参数
const getGeoserverImg = (layerName, width, height, bbox, srs) => {
  // 定义一个参数对象，该对象包含了WMS服务的请求参数
  const params = {
    service: "WMS", // 服务类型
    version: "1.1.0", // 版本号
    request: "GetMap", // 请求类型
    layers: `LUU:${layerName}`, // 请求的图层
    styles: "", // 样式
    bbox, // 边界框
    width, // 图像的宽度
    height, // 图像的高度
    srs, // 空间参考系统
    format: "image/jpeg", // 返回的图像格式
    exceptions: "application/vnd.ogc.se_inimage", // 异常处理方式
  };

  // 使用request库发送一个GET请求到Geoserver的WMS服务，并返回一个流
  return request.get(`/LUU/wms`, {
    params,
    responseType: "stream",
  });
};


module.exports = {
  getGeoserverInfo,
  getGeoserverImg,
};
