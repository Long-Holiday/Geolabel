const router = require("koa-router")();
const path = require("path");
const fs = require("fs");
const {
  getGeoserverInfo,
  getGeoserverImg,
} = require("../../controller/geoserverController.js");
const DOWNLOAD_DIR = path.join(__dirname, "../../public/img");
router.get("/geoserver", async (ctx, next) => {
  const { filename } = ctx.query;
  // 获取服务对应图片信息
  const img = await getGeoserverInfo(filename);
  const {
    coverage: {
      latLonBoundingBox: { minx, maxx, miny, maxy },
      // latLonBoundingBox: { minx, miny, maxx, maxy },
    },
  } = img.data;
  const width = Math.ceil(((maxx - minx) / (maxy - miny)) * 600);
  // 下载图片
  const result = await getGeoserverImg(
    filename,
    width,
    600,
      `${minx},${maxx},${miny},${maxy}`,
    // `${minx},${miny},${maxx},${maxy}`,
    "EPSG:3857"
  );
  const filePath = path.join(DOWNLOAD_DIR, `${filename}.jpeg`); // 设置本地文件路径
  const writer = fs.createWriteStream(filePath);
  // 将响应流中的数据写入到可写流中
  result.data.pipe(writer);
  ctx.body = { code: 200 };
});

module.exports = router;
