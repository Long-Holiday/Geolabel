const knex = require("../utils/knex");

const getTotalTasks = () => knex("task").count("* as count").first();

const createTask = (daterange, taskname, type, mapserver) =>
  knex("task").insert(
    {
      daterange,
      taskname,
      type,
      mapserver,
    },
    ["taskid"]
  );
const getTaskInfo = () =>
  knex
    .select(
      "taskaccepted.id",
      "taskaccepted.typestring",
      "user.username as username",
      "user.userid as userid",
      "task.*"
    )
    .from("task")
    .join("taskaccepted", "task.taskid", "=", "taskaccepted.taskid")
    .join("user", "taskaccepted.username", "=", "user.username")
    .orderByRaw("status, taskid DESC");
const deleteTaskById = (taskid) => knex("task").del().where({ taskid });

const updateTaskById = (taskid, daterange, taskname, type, mapserver) =>
  knex("task").where({ taskid }).update({
    daterange,
    taskname,
    type,
    mapserver,
  });
const updateTaskMarkTableById = (taskid, marktable) =>
  knex("task").where({ taskid }).update({
    marktable,
  });

const findAllTask = () =>
  knex
    .select(
      "task.*",
      "datasetstore.sampleid",
      "datasetstore.samplename",
      "datasetstore.ispublic"
    )
    .from("task")
    .join("datasetstore", "datasetstore.taskid", "=", "task.taskid");

const findPublicTask = () =>
  knex
    .select(
      "task.*",
      "datasetstore.sampleid",
      "datasetstore.samplename",
      "datasetstore.ispublic"
    )
    .from("task")
    .join("datasetstore", "datasetstore.taskid", "=", "task.taskid")
    .where("datasetstore.ispublic", "=", 1);

const selectTaskById = (taskid) => knex("task").select().where({ taskid });

const updateTaskStatus = (taskid) =>
  knex("task").update({ status: 0 }).where({ taskid });

const auditTask = (status, auditfeedback, taskid) =>
  knex("task").update({ status, auditfeedback }).where({ taskid });

const createTaskAccept = (username, taskid, typestring) =>
  knex("taskaccepted").insert({
    username,
    taskid,
    typestring,
  });

const findTasksByUsername = (username) =>
  knex("taskaccepted").select(["taskid"]).where({ username });

const deleteTaskAcceptById = (id) => knex("taskaccepted").del().where({ id });

const findUserListByTaskId = (taskid) =>
  knex("taskaccepted").select(["username"]).where({ taskid });
module.exports = {
  getTotalTasks,
  getTaskInfo,
  createTask,
  createTaskAccept,
  updateTaskById,
  deleteTaskAcceptById,
  deleteTaskById,
  updateTaskMarkTableById,
  selectTaskById,
  updateTaskStatus,
  auditTask,
  findTasksByUsername,
  findPublicTask,
  findAllTask,
  findUserListByTaskId,
};
