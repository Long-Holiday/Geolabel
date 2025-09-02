const fs = require("fs");
const path = require("path");
const SERVERDOWNLOAD_DIR = path.join(__dirname, "../public/img");
const SAMPLEDOWNLOAD_DIR = path.join(__dirname, "../public/dataset_temp");

// getServerImg 函数用于获取服务器上的图片
const getServerImg = async (ctx, next) => {
  // 从请求参数中获取图片名称
  const { img } = ctx.params;
  // 构造图片的完整路径
  const imagePath = path.join(SERVERDOWNLOAD_DIR, img);
  // 读取图片文件
  const image = fs.readFileSync(imagePath);
  // 设置响应的 Content-Type 为 image/png
  ctx.set("Content-Type", "image/png");
  // 返回图片内容
  ctx.body = image;
};
const getSampleImg = async (ctx, next) => {
  // 从请求参数中获取图片源和任务ID
  const { imgsrc, taskid } = ctx.request.query;
  console.log(imgsrc, taskid);
  // 构造图片的完整路径
  const imagePath = path.join(
    SAMPLEDOWNLOAD_DIR,
    `mark_${taskid}`,
    imgsrc + ".jpeg"
  );
  // 读取图片文件
  const image = fs.readFileSync(imagePath);
  // 设置响应的 Content-Type 为 image/png
  ctx.set("Content-Type", "image/png");
  // 返回图片内容
  ctx.body = image;
};
module.exports = {
  getServerImg,
  getSampleImg,
};
