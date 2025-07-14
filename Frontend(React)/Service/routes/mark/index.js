const router = require("koa-router")();
const markController = require("../../controller/markController.js");

router.post("/save", markController.saveMarkInfo);

module.exports = router;

//#region
/* router.post("/save", async (ctx, next) => {
  const { id, jsondata } = ctx.request.body;
  const markTableName = `mark_${id}`;
  const geometryArr = geojsonToGeometry(jsondata);
  // console.log(geojsonToGeometry(jsondata));
  const exist = await knex.schema.hasTable(markTableName);
  if (exist) {
    await knex(markTableName).truncate();
    await knex(markTableName).insert(geometryArr);
    ctx.body = { code: 200 };
  } else {
    await knex.schema.createTable(markTableName, (table) => {
      table.increments("fid").primary();
      table.string("geom");
      table.integer("typeid");
      // table.geometry("geom");
      // table.integer("gid");
    });
    await knex(markTableName).insert(geometryArr);
    await knex("task").update({ marktable: markTableName }).where({ taskid: id });
  }
  ctx.body = { code: 200 };
}); */
//#endregion

// 绘制的 features 对象中的坐标数组，分别是从绘制的点开始，逆时针排列
// 裁剪的图像遍历四个数组对，分别获取数组对最小的和最大的X点和Y点，拼成左上角和右下角，左上角为（最小的x,最大的y),右下角为（最大的x,最小的y)
// todo 提交标注任务，根据任务id,拿出数据库中的坐标数组，遍历数组，计算适宜的尺寸，拼接url生成图像，放入指定文件夹中 // 保存
/* 
后端返回
{
  markGeoJsonArr: [
    { typecode: 001, typename: "建筑",typecolor:'#666', markGeoJson },
    { typecode: 002, typename: "水体",typecolor:'#666',  markGeoJson },
  ];
} */
/* 
前端提交
{
id:11,
jsondataArr:[
  {
    features:...
    type:'FeatureCollection'
    typecode:001,
    typename: "建筑",
  },
   {
    features:...
    type:'FeatureCollection'
    typecode:002,
    typename: "建筑",
  }
]
}
*/
