const knex = require("../utils/knex");

const isMarkTable = (markTableName) => knex.schema.hasTable(markTableName);

const createMartTable = (markTableName) =>
  knex.schema.createTable(markTableName, (table) => {
    table.increments("fid").primary();
    table.text("geom");
    table.integer("typeid");
    table.integer("markId");
    // table.geometry("geom");
    // table.integer("gid");
  });

// Add function to update existing tables
const updateMarkTable = async (markTableName) => {
  const hasMarkId = await knex.schema.hasColumn(markTableName, "markId");
  if (!hasMarkId) {
    await knex.schema.alterTable(markTableName, (table) => {
      table.integer("markId");
    });
  }
};

const insertMarkInfo = (markTableName, markInfoArr) =>
  knex(markTableName).insert(markInfoArr);

const getMarkInfoGroupByType = (tableName) =>
  knex(tableName)
    .select("type.*", knex.raw("ARRAY_AGG(geom) as geomarr"))
    .join("type", `${tableName}.typeid`, "type.typeid")
    .groupBy("type.typeid");

const getMarkInfoArr = (tableName) =>
  knex
    .select(
      `${tableName}.geom`,
      `${tableName}.typeid`,
      `${tableName}.fid`,
      `${tableName}.markId`,
      "type.typecolor"
    )
    .from(tableName)
    .join("type", `${tableName}.typeid`, "=", "type.typeid");

const deleteMarkTableByName = (name) => knex.schema.dropTable(name);

const deleteMarkInfoByTypeId = (markTableName, typeid) =>
  knex(markTableName).del().where({ typeid });

module.exports = {
  getMarkInfoGroupByType,
  createMartTable,
  deleteMarkTableByName,
  deleteMarkInfoByTypeId,
  isMarkTable,
  insertMarkInfo,
  getMarkInfoArr,
  updateMarkTable,
};
