const router = require("koa-router")();
const typeController = require("../../controller/typeController");
const { geojsonToGeometry } = require("../../utils/convert.js");
router.get("/type/:typeid?", typeController.getType);

router.post("/type", typeController.newType);

router.put("/type", typeController.updateType);

router.delete("/type/:typeid", typeController.deleteType);

module.exports = router;
