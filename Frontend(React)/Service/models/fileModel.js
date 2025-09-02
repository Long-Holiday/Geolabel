const knex = require("../utils/knex");
const createFile = (filename, updatetime, size) => {
  return knex("file").insert({
    filename,
    updatetime,
    status: 0,
    size,
  });
};
const getFiles = (current, pageSize) => {
  // 使用knex查询构造器，对"file"表进行查询
  // select()用于选择所有列
  // orderBy("fileid", "desc")用于按照"fileid"列的降序排序
  // limit(pageSize)用于限制返回的记录数，即每页显示的文件数量
  // offset(pageSize * (current - 1))用于设置查询的起始位置，即跳过前面的记录
  return knex("file")
    .select()
    .orderBy("fileid", "desc")
    .limit(pageSize)
    .offset(pageSize * (current - 1));
};

const getTotalFiles = () => {
  // 使用knex查询构造器，对"file"表进行查询
  // count("* as count")用于计算"file"表中的记录总数，并将结果命名为"count"
  // first()用于返回查询结果的第一条记录
  return knex("file").count("* as count").first();
};

const updateFile = (fileid, filename, updatetime) => {
  return knex("file").where({ fileid }).update({ filename, updatetime });
};
const deleteFileByFilename = (filename) => {
  return knex("file").del().where({ filename });
};
const changeFileStatus = () => {
  return knex("file");
};
module.exports = {
  createFile,
  getFiles,
  getTotalFiles,
  updateFile,
  deleteFileByFilename,
  changeFileStatus,
};
