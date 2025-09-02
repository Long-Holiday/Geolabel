const router = require("koa-router")();
const knex = require("../utils/knex.js");
const user = require("./user");
const task = require("./task");
const server = require("./server");
const file = require("./file");
const geoserver = require("./geoserver");
const image = require("./image");
const mark = require("./mark");
const type = require("./type");
const dataset = require("./dataset");
router.get("/", async (ctx, next) => {
  await ctx.render("index", {
    title: "Hello Koa 2!",
  });
});
router.use("/user", user.routes(), user.allowedMethods());
router.use(task.routes(), task.allowedMethods());
router.use(server.routes(), server.allowedMethods());
router.use(file.routes(), file.allowedMethods());
router.use(geoserver.routes(), geoserver.allowedMethods());
router.use(image.routes(), image.allowedMethods());
router.use(mark.routes(), mark.allowedMethods());
router.use(type.routes(), type.allowedMethods());
router.use("/datasetStore", dataset.routes(), dataset.allowedMethods());

module.exports = router;
