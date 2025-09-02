const { covertCoordinate } = require("../utils/convert");
const MarkModel = require("../models/markModel");
const TaskModal= require("../models/taskModel"); 	//importing task modal from models.js

const saveMarkInfo = async (ctx, next) => {
  try {
    console.log('Received save request:', ctx.request.body);
    const { id, jsondataArr, typeArr } = ctx.request.body;
    console.log('Request data:', { id, jsondataArr, typeArr });
    
    if (!id || !jsondataArr || !typeArr) {
      console.error('Missing required fields:', { id, jsondataArr, typeArr });
      ctx.status = 400;
      ctx.body = { code: 400, message: 'Missing required fields' };
      return;
    }

    const markTableName = `mark_${id}`;
    console.log('Processing data for table:', markTableName);
    
    const geometryArr = covertCoordinate(jsondataArr);
    console.log('Converted geometry array:', geometryArr);
    
    let markInfoArr = [];
    // 过滤掉不是自身标注的内容
    for (const { typeid } of typeArr) {
      const filteredItems = geometryArr.filter((item) => item.typeid == typeid);
      console.log(`Filtered items for typeid ${typeid}:`, filteredItems);
      markInfoArr.push(...filteredItems);
    }
    
    console.log('Final markInfoArr:', markInfoArr);
    
    if (!markInfoArr.length) {
      console.log("没有标注");
      for (const { typeid } of typeArr) {
        await MarkModel.deleteMarkInfoByTypeId(markTableName, typeid);
      }
      ctx.body = { code: 200 };
      return;
    }

    const exist = await MarkModel.isMarkTable(markTableName);
    console.log('Table exists:', exist);
    
    if (exist) {
      console.log("表存在");
      // Update table structure if needed
      await MarkModel.updateMarkTable(markTableName);
      for (const { typeid } of typeArr) {
        await MarkModel.deleteMarkInfoByTypeId(markTableName, typeid);
      }
      await MarkModel.insertMarkInfo(markTableName, markInfoArr);
      ctx.body = { code: 200 };
      return;
    } else {
      console.log("新建表");
      await MarkModel.createMartTable(markTableName);
      await MarkModel.insertMarkInfo(markTableName, markInfoArr);
      await TaskModal.updateTaskMarkTableById(id, markTableName);
    }
    ctx.body = { code: 200 };
  } catch (error) {
    console.error('Error in saveMarkInfo:', error);
    ctx.status = 500;
    ctx.body = { code: 500, message: 'Internal server error' };
  }
};
module.exports = {
  saveMarkInfo,
};
