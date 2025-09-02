const Koa = require("koa");
const app = new Koa();
const views = require("koa-views");
const json = require("koa-json");
const onerror = require("koa-onerror");
const bodyparser = require("koa-bodyparser");
const logger = require("koa-logger");
const index = require("./routes/index");
const session = require("koa-session");
const { koaBody } = require("koa-body");
const cors = require("@koa/cors");
const path = require("path");
app.use(
  cors({
    origin: "http://localhost:8000",
    maxAge: 2592000,
    // 必要配置
    credentials: true,
  })
);
// error handler
onerror(app);
// 处理静态资源
app.use(
  koaBody({
    multipart: true,
    formidable: {
      uploadDir: path.join(__dirname, "/public/temp"), // 文件上传目录
      keepExtensions: true, // 保留文件扩展名
      maxFileSize: 1024 * 1024 * 1024, // 设置上传文件大小最大限制，默认2M
    },
  })
);
// middlewares
app.use(
  bodyparser({
    enableTypes: ["json", "form", "text"],
  })
);
app.use(json());
app.use(logger());
app.use(require("koa-static")(path.join(__dirname, "public")));

app.use(
  views(__dirname + "/views", {
    extension: "pug",
  })
);

// logger
app.use(async (ctx, next) => {
  const start = new Date();
  await next();
  const ms = new Date() - start;
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
});

// 挂载 session 中间件
app.keys = ["secretId"];
//三天过期
app.use(session({ maxAge: 1000 * 60 * 60 * 72 }, app));

// routes 启动路由
app.use(index.routes(), index.allowedMethods());

// error-handling
app.on("error", (err, ctx) => {
  console.error("server error", err, ctx);
});

module.exports = app;
