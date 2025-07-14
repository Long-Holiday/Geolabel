const knex = require("../utils/knex");

const createDataset = (taskid) =>
  knex("datasetstore").insert(
    {
      taskid,
      ispublic: 0,
    },
    ["sampleid"]
  );

const findDatasetByTaskId = (taskid) =>
  knex
    .select(
      "task.*",
      "datasetstore.sampleid",
      "datasetstore.samplename",
      "datasetstore.ispublic"
    )
    .from("task")
    .join("datasetstore", "datasetstore.taskid", "=", taskid)
    .where("task.taskid", "=", taskid);

const getTotalImgNumBySampleId = (sampleid) =>
  knex("sampleimg").count("* as count").first().where({ sampleid });

// 定义一个函数，该函数接受样本ID、页大小和当前页数作为参数
const findImgSrcIdBySampleId = (sampleid, pageSize, current) =>
  // 使用Knex.js库从"sampleimg"表中查询数据
  knex("sampleimg")
    // 选择"sampleimg.imgsrc"和"type.typename"两个字段
    .select("sampleimg.imgsrc", "type.typename")
    // 使用"sampleimg.typeid"和"type.typeid"两个字段连接"sampleimg"表和"type"表
    .join("type", "sampleimg.typeid", "=", "type.typeid")
    // 添加一个条件，即"sampleimg.sampleid"必须等于传入的样本ID
    .where("sampleimg.sampleid", sampleid)
    // 限制返回的结果数量为页大小
    .limit(pageSize)
    // 根据当前页数计算偏移量，以便获取正确的数据页
    .offset(pageSize * (current - 1));


const updateDatasetStatusBySampleId = (ispublic, sampleid) =>
  knex("datasetstore").update({ ispublic }).where({ sampleid });

const hasGenerateDataset = (taskid) =>
  knex("datasetstore").select(["taskid"]).where({ taskid });

const insertSampleImgInfo = (sampleid, typeid, imgsrc) =>
  knex("sampleimg").insert({
    sampleid,
    typeid,
    imgsrc,
  });
const deleteDatastoreById = (sampleid) =>
  knex("datasetstore").del().where({ sampleid });
module.exports = {
  findDatasetByTaskId,
  getTotalImgNumBySampleId,
  findImgSrcIdBySampleId,
  updateDatasetStatusBySampleId,
  hasGenerateDataset,
  createDataset,
  insertSampleImgInfo,
  deleteDatastoreById,
};
