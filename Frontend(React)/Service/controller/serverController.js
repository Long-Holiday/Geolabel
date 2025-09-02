const ServerModel = require("../models/serverModel");
const FileModel = require("../models/fileModel");
const request = require("../utils/request");
const fs = require("fs");
const path = require("path");
const fse = require("fs-extra");
const DOWNLOAD_DIR = path.join(__dirname, "../public/img");

const getServers = async (ctx, next) => {
  const rows = await ServerModel.getServers();
  ctx.body = { code: 200, success: true, data: rows, total: rows.length };
};

const deleteServer = async (ctx, next) => {
  const { sername } = ctx.params;
  await ServerModel.deleteServerByName(sername);
  await fse.unlink(path.join(DOWNLOAD_DIR, sername + ".jpeg"));
  const rows = await FileModel.changeFileStatus()
    .update({ status: 0 })
    .where({ filename: sername + ".tif" });
  if (rows == 0) {
    await FileModel.changeFileStatus()
      .update({ status: 0 })
      .where({ filename: sername + ".tiff" });
  }
  ctx.body = { code: 200, success: true };
};
// 发布服务
const createServer = async (ctx, next) => {
  const { filename, sername, serdesc, seryear, publisher, publishtime } =
    ctx.request.body;
  const rows = await ServerModel.createServer(
    sername,
    serdesc,
    seryear,
    publisher,
    publishtime
  );
  await FileModel.changeFileStatus().update({ status: 1 }).where({ filename });
  //   将控制权交到downloadServerImg
  await next();
  console.log("后执行");
  if (rows) {
    ctx.body = { code: 200, success: true };
  }
};

const downloadServerImg = async (ctx, next) => {
  console.log("先执行");
  const { sername: filename } = ctx.request.body;
  // 获取服务对应图片信息
  const img = await request.get(
    `/rest/workspaces/LUU/coveragestores/${filename}/coverages/${filename}.json`,
    {
      auth: {
        username: "admin",
        password: "geoserver",
      },
    }
  );
  const {
    coverage: {
      // latLonBoundingBox: { minx, miny, maxx, maxy },
      latLonBoundingBox: { minx, maxx, miny, maxy },
    },
    srs,
  } = img.data;
  const width = Math.ceil(((maxx - minx) / (maxy - miny)) * 600);
  const params = {
    service: "WMS",
    version: "1.1.0",
    request: "GetMap",
    layers: `LUU:${filename}`,
    styles: "",
    bbox: `${minx},${maxx},${miny},${maxy}`,
    // bbox: `${minx},${miny},${maxx},${maxy}`,
    width, // 指定宽度
    height: 600, // 指定高度
    srs,
    format: "image/jpeg",
    // transparent: true,
  };
  console.log(params);
  // 下载图片
  const result = await request.get(`/LUU/wms`, {
    params,
    responseType: "stream",
  });
  const filePath = path.join(DOWNLOAD_DIR, `${filename}.jpeg`); // 设置本地文件路径
  const writer = fs.createWriteStream(filePath);
  // 将响应流中的数据写入到可写流中
  result.data.pipe(writer);
};
module.exports = {
  createServer,
  getServers,
  downloadServerImg,
  deleteServer,
};
