const TaskModel = require("../models/taskModel");
const TypeModel = require("../models/typeModel");
const MarkModel = require("../models/markModel");
const { convertGeojson } = require("../utils/convert");

const getTasks = async (ctx, next) => {
  const {
    session: { user },
  } = ctx;
  const {
    query: { taskname, current = 1, pageSize = 5, userArr, isAdmin },
  } = ctx;
  const { taskid } = ctx.params;
  const all = await TaskModel.getTotalTasks();

  let markGeoJson = [];

  let rows = await TaskModel.getTaskInfo();
  // 相同任务抽离
  let result = rows.reduce(
    (
      pre,
      {
        taskid: reduceTaskId,
        taskname,
        type,
        mapserver,
        daterange,
        marktable,
        status,
        auditfeedback,
        userid,
        username,
        id,
        typestring,
      }
    ) => {
      // 查找是否已经存在该 id 对应的对象
      const existingObj = pre.find((obj) => obj.taskid === reduceTaskId);
      // 标注地图时才需要遍历标签方案
      let typeArr = typestring.split(",").map((item) => Number(item));
      if (taskid) {
        typeArr = [];
        const typeStringArr = typestring?.split(",");
        for (const typeIdString of typeStringArr) {
          TypeModel.getTypes(Number(typeIdString)).then((rows) => {
            console.log("rows");
            typeArr.push(rows[0]);
          });
        }
      }

      if (existingObj) {
        // 如果已经存在，直接将用户信息添加到 userArr 数组中
        existingObj.userArr.push({
          userid,
          username,
          id,
          typeArr,
        });
        // existingObj.userArr.push(username);
      } else {
        // 如果不存在，创建新对象并添加到结果数组中
        pre.push({
          taskid: reduceTaskId,
          taskname,
          type,
          mapserver,
          daterange,
          marktable,
          status,
          auditfeedback,
          userArr: [{ userid, username, id, typeArr }],
          // userArr: [username],
        });
      }
      return pre;
    },
    []
  );
  result.map((item) => {
    item.daterange = item.daterange.split(" ");
  });
  // 模糊查询
  if (taskname) {
    result = result.filter((item) => {
      return item.taskname.includes(taskname);
    });
  }
  // 模糊查询
  if (userArr) {
    if (isAdmin != 1) {
      result = result.filter((item) => {
        let flag = false;
        for (const { username } of item.userArr) {
          if (username.includes(userArr)) {
            flag = true;
          }
        }
        return flag;
      });
    }
  }
  // 开始标注
  if (taskid) {
    console.log(user, "当前标注用户");
    // 多人轮询方案
    //#region
    /*  if (!onlineUsers.has(taskid)) {
        console.log("新增任务队列：", taskid, "用户：", user.userName);
        onlineUsers.set(taskid, [user.userName]);
      } else {
        // 将新用户添加到队列中
        console.log("任务：", taskid, "新增用户：", user.userName);
        onlineUsers.set(taskid, [...onlineUsers.get(taskid), user.userName]);
      }
      // 定时从标注人员队列中删除
      setTimeout(() => {
        let newUserArr = onlineUsers
          .get(taskid)
          .filter((item) => item != user.userName);
        console.log("任务：" + taskid + "移除用户：", user.userName);
        if (!newUserArr.length) {
          // 如果已经是最后一个，就删除对应task记录
          console.log("移除任务：", taskid);
          onlineUsers.delete(taskid);
        } else {
          // 把未操作的用户移除
          onlineUsers.set(taskid, newUserArr);
        }
      }, 10000); // 用户离线时间设为两分钟，1s = 1000ms
      console.log(onlineUsers, "在线用户"); */
    //#endregion
    result = result.filter((item) => {
      return item.taskid == taskid;
    });
    // 查询是否有标注信息
    const exist = await MarkModel.isMarkTable(result[0].marktable);
    if (exist) {
      //分组查询
      markGeoJson = await MarkModel.getMarkInfoGroupByType(result[0].marktable);
    }
  }
  console.log(markGeoJson, "markGeoJson");
  ctx.body = {
    code: 200,
    data: result.slice(
      Number(pageSize * (current - 1)),
      Number(pageSize) + Number(pageSize * (current - 1))
    ),
    success: true,
    // currentMarkUser: onlineUsers.get(taskid).length,
    // markGeoJsonArr: markGeoJson,
    markGeoJsonArr: convertGeojson(markGeoJson),
    total: taskname || userArr ? result?.length : all.count,
  };
};

const publishTask = async (ctx, next) => {
  let { daterange, taskname, type, mapserver, userArr } = ctx.request.body;
  console.log(Object.keys(ctx.request.body));

  daterange = `${daterange[0]} ${daterange[1]}`;
  console.log(ctx.request.body);

  const rows = await TaskModel.createTask(daterange, taskname, type, mapserver);

  console.log(rows[0].taskid, "任务id");

  const { taskid } = rows[0];
  if (rows[0].taskid) {
    for (const username of userArr) {
      const typestring = ctx.request.body[username].join(",");
      console.log(typestring, "标签方案ID");
      await TaskModel.createTaskAccept(username, taskid, typestring);
    }
    ctx.body = { code: 200 };
  }
};

const updateTask = async (ctx, next) => {
  let { taskid, userArr, daterange, taskname, type, mapserver, userArrId } =
    ctx.request.body;
  daterange = `${daterange[0]} ${daterange[1]}`;
  await TaskModel.updateTaskById(taskid, daterange, taskname, type, mapserver);
  // 因为更新的用户可能会减少，所以直接删除数据，重新插入
  for (const id of userArrId) {
    await TaskModel.deleteTaskAcceptById(id);
  }
  for (const username of userArr) {
    const typestring = ctx.request.body[username].join(",");
    console.log(typestring, "标签方案ID");
    await TaskModel.createTaskAccept(username, taskid, typestring);
  }
  ctx.body = { code: 200 };
};

const deleteTask = async (ctx, next) => {
  const { taskid } = ctx.params;
  await TaskModel.deleteTaskById(taskid);
  await MarkModel.deleteMarkTableByName(`mark_${taskid}`);
  console.log("删除任务成功！");
  ctx.body = { code: 200 };
};

const submitTask = async (ctx, next) => {
  const { taskid } = ctx.request.body;
  const task = await TaskModel.selectTaskById(taskid);
  if (!task[0].marktable) {
    ctx.body = { code: 200, message: "未开始标注！" };
    return;
  }
  await TaskModel.updateTaskStatus(taskid);
  ctx.body = { code: 200, message: "提交成功！" };
};

const auditTask = async (ctx, next) => {
  const { taskid, status, auditfeedback } = ctx.request.body;
  await TaskModel.auditTask(status, auditfeedback, taskid);
  ctx.body = { code: 200, message: "提交成功！" };
};
module.exports = {
  getTasks,
  publishTask,
  updateTask,
  deleteTask,
  submitTask,
  auditTask,
};
