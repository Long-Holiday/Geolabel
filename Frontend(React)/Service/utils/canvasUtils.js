const { createCanvas, loadImage, Path2D } = require("canvas");
const fs = require("fs");
/**
 * 将多张图片合并成一张大图
 * @param {Array} imagePaths - 待合并的图片路径数组
 * @param {string} outputPath - 输出路径
 * @param {number} cols - 每行的图片数量
 * @param {number} width - 输出图片的宽度
 * @param {number} height - 输出图片的高度
 */
async function mergeImages(
  imagePaths,
  outputPath,
  cols,
  width = 512,
  height = 512
) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // 加载图片并绘制
  const promises = imagePaths.map(async (imagePath, index) => {
    console.log("开始绘制");
    const row = Math.floor(index / cols); // 计算行数
    const col = index % cols; // 计算列数
    // console.log(`第${row}行，${col}列`);
    // console.log(
    //   (col * width) / cols,
    //   (row * height) / Math.ceil(imagePaths.length / cols),
    //   width / cols,
    //   height / Math.ceil(imagePaths.length / cols)
    // );
    // console.log(fs.existsSync(imagePath), "是否存在");
    const img = await loadImage(imagePath);
    ctx.drawImage(
      img,
      (col * width) / cols,
      (row * height) / Math.ceil(imagePaths.length / cols),
      width / cols,
      height / cols
      // height / Math.ceil(imagePaths.length / cols)
    );
  });

  await Promise.all(promises);

  // 输出图片
  const out = fs.createWriteStream(outputPath);
  const stream = canvas.createPNGStream();
  stream.pipe(out);
  out.on("finish", () => {
    ctx.clearRect(0, 0, width, height);
    console.log(`The image was saved to ${outputPath}`);
  });
}
// 定义一个函数，该函数接受宽度、高度、像素数组和输出路径作为参数
function generateStuffImg(width, height, pixelArr, outPutPath) {
  // 创建一个新的画布，大小为指定的宽度和高度
  const canvas = createCanvas(width, height);
  // 获取2D渲染上下文
  const ctx2d = canvas.getContext("2d");
  // 设置填充颜色为黑色
  ctx2d.fillStyle = "black";
  // 在画布上绘制一个黑色的矩形，大小和位置与画布相同
  ctx2d.fillRect(0, 0, width, height);
  // 遍历像素数组
  for (let index = 0; index < pixelArr.length; index++) {
    // 从像素数组中获取分割和类型颜色
    const { segmentation, typecolor } = pixelArr[index];
    // 开始一个新的路径
    ctx2d.beginPath();
    // 将路径的起点移动到指定的坐标
    ctx2d.moveTo(segmentation[0], segmentation[1]);
    // 遍历分割数组
    for (let i = 2; i < segmentation.length; i += 2) {
      // 在路径中添加一个新的点
      ctx2d.lineTo(segmentation[i], segmentation[i + 1]);
    }
    // 设置填充颜色为类型颜色
    ctx2d.fillStyle = typecolor;
    // 填充当前路径
    ctx2d.fill();
  }

  // 创建一个可写流，用于将数据写入文件
  const out = fs.createWriteStream(outPutPath);

  // 创建一个PNG流，用于将画布的内容转换为PNG格式
  const stream = canvas.createPNGStream();

  // 将PNG流中的数据写入到可写流中
  stream.pipe(out);
  // 当所有数据都已写入到可写流中时，打印一条消息
  out.on("finish", () => {
    console.log("Output PNG written");
  });
}

// if (pixelArr.length >= 6) {
//   ctx2d.beginPath();
//   ctx2d.moveTo(pixelArr[0].bbox[0], pixelArr[0].bbox[1]);
//   console.log(pixelArr[0], pixelArr[1], "起点");
//   // -2的原因是segmentationArr最后一个坐标与第一个相同
//   for (let i = 2; i <= pixelArr.length - 2; i += 2) {
//     ctx2d.lineTo(pixelArr[i], pixelArr[i + 1]);
//     console.log(pixelArr[i], pixelArr[i + 1], "画点");
//   }
//   // ctx2d.closePath();
//   // 填充红色
//   ctx2d.fillStyle = "red";
//   ctx2d.fill();
//   const out = fs.createWriteStream(outPutPath + "/train_01.png");
//   const stream = canvas.createPNGStream();
//   stream.pipe(out);
//   out.on("finish", () => {
//     console.log("Output PNG written");
//   });
// }
module.exports = { mergeImages, generateStuffImg };
