const router = require("koa-router")();
const taskController = require("../../controller/taskController.js");

router.get("/tasks/:taskid?", taskController.getTasks);

router.post("/tasks", taskController.publishTask);

router.put("/tasks", taskController.updateTask);

router.delete("/tasks/:taskid", taskController.deleteTask);

//用户提交任务
router.post("/submitTask", taskController.submitTask);

// 管理员审核任务
router.post("/auditTask", taskController.auditTask);
module.exports = router;
/* 
后端返回
{
  markGeoJsonArr: [
    { typecode: 001, typename: "建筑",typecolor:'#666', markGeoJson:[] },
    { typecode: 002, typename: "水体",typecolor:'#666', markGeoJson:[] },
  ];
} */
/* 
前端提交
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
*/
