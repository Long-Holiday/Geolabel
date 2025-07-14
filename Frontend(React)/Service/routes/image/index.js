const router = require("koa-router")();
const path = require("path");
const { mergeImages } = require("../../utils/canvasUtils");
const outputPath = path.join(__dirname, "../../public/merge");
const imgController = require("../../controller/imgController");
// 服务缩略图
router.get("/image/:img", imgController.getServerImg);
// 样本图
router.get("/sampleImage", imgController.getSampleImg);

// 测试接口
router.get("/merageSampleImage", async (ctx, next) => {
  const { id } = ctx.query;
  let imagePaths = [];
  for (let index = 1; index < 65; index++) {
    imagePaths.push(
      `http://localhost:3000/sampleImage?imgsrc=${index}&taskid=46`
    );
  }
  console.log(imagePaths);
  for (let i = 0; i < imagePaths.length; i += 16) {
    const args = imagePaths.slice(i, i + 16);
    mergeImages(
      [...args],
      path.join(outputPath, `${i + 1}-${i + 16}_merge.jpeg`),
      4,
      512,
      512
    );
  }
  // mergeImages(imagePaths, outputPath, 2, 512, 512);
  ctx.body = { code: 200 };
});

module.exports = router;
