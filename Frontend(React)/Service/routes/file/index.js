const router = require("koa-router")();
const fileController = require("../../controller/fileController.js");

router.get("/files", fileController.getAllFiles);

router.get("/filePath", fileController.getFilePath);

router.post("/uploadTif", fileController.upLoadTif);

router.post("/uploadSuccess", fileController.mergeTif);

router.put("/files", fileController.updateFile);

router.delete("/files/:filename", fileController.deleteFile);

module.exports = router;
// koa--->springboot

