const TypeModel = require("../models/typeModel");
const getType = async (ctx, next) => {
  const {
    query: { typeid: typecode, current, pageSize, typename },
    params: { typeid },
  } = ctx;

  try {
    const types = await TypeModel.getTypes(
      typeid,
      typecode,
      typename,
      current,
      pageSize
    );
    const sum = await TypeModel.getTotalTypes();
    const total = typecode || typename ? types.length : sum.count;
    console.log(await TypeModel.getTotalTypes().count);
    ctx.body = {
      code: 200,
      data: types,
      success: true,
      total: total,
    };
  } catch (error) {
    console.log("获取类型失败:", error);
    ctx.body = { code: 500, info: "获取类型失败" };
  }
};
const newType = async (ctx, next) => {
  const rows = await TypeModel.createTypes(ctx.request.body);
  console.log(rows);
  if (rows) {
    ctx.body = { code: 200 };
  }
};
const updateType = async (ctx, next) => {
  let { typeid, typecolor, typename, typecode } = ctx.request.body;
  await TypeModel.updateType(typeid, typecolor, typename, typecode);
  ctx.body = { code: 200 };
};
const deleteType = async (ctx, next) => {
  const { typeid } = ctx.params;
  await TypeModel.deleteTypeById(typeid);
  console.log("删除类别成功！");
  ctx.body = { code: 200 };
};
module.exports = {
  getType,
  newType,
  updateType,
  deleteType,
};
