const knex = require("../utils/knex");
const getTypes = async (typeid, typecode, typename, current, pageSize) => {
  let query = knex("type")
    .select()
    .orderBy("typeid", "asc")
    .limit(pageSize)
    .offset(pageSize * (current - 1));

  if (typeid) {
    query = query.where({ typeid });
  }
  if (typecode) {
    query = query.where({ typeid: typecode });
  }
  if (typename) {
    query = query.where({ typename });
  }

  return query;
};

const getTotalTypes = async () => {
  return knex("type").count("* as count").first();
};
const createTypes = async (type) => {
  return knex("type").insert(type);
};
const updateType = async (typeid, typecolor, typename, typecode) => {
  return knex("type").where({ typeid }).update({
    typecolor,
    typename,
    typecode,
  });
};
const deleteTypeById = async (typeid) => knex("type").del().where({ typeid });

const getTypeById = (typeid) => knex("type").select().where({ typeid });

const getTypeNameById = (typeid) =>
  knex("type").select(["typename"]).where({ typeid });

module.exports = {
  getTypes,
  getTotalTypes,
  createTypes,
  updateType,
  deleteTypeById,
  getTypeById,
  getTypeNameById,
};
