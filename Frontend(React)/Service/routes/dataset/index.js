const router = require("koa-router")();
const path = require("path");
const { generateStuffImg } = require("../../utils/canvasUtils.js");
const OUTPUT_DIR = path.join(__dirname, `../../public/dataset`);
const datasetController = require("../../controller/datasetController.js");

//获取样本集
router.get("/dataset", datasetController.getDataSet);
// 获取样本图
router.get("/sampleImageList", datasetController.getSampleImageList);
// 设置公开
router.post("/setDatasetStatus", datasetController.setDatasetStatus);
// 生成数据集 coco
router.post("/generateDataset", datasetController.generateDataset);

router.delete("/deleteDataset", datasetController.deleteDataset);

router.get("/download/:taskid", datasetController.downloadDataset);
// 批量下载多个数据集作为COCO
router.post("/downloadMultiple", datasetController.downloadMultipleDatasets);
// 下载已合并的文件
router.get("/download-merged-file", datasetController.downloadMergedFile);

// 测试接口
router.get("/generateImg", async (ctx, next) => {
  generateStuffImg(
    200,
    200,
    [0, 0, 0, 100, 100, 100, 100, 0, 0, 0],
    OUTPUT_DIR
  );
  ctx.body = { code: 200 };
});

module.exports = router;
