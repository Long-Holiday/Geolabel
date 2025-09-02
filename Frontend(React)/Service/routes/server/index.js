const router = require("koa-router")();
const serverController = require("../../controller/serverController.js");

router.get("/server", serverController.getServers);

router.post("/server", serverController.createServer);
// 交出控制权
router.post("/server", serverController.downloadServerImg);

router.delete("/server/:sername", serverController.deleteServer);

module.exports = router;
