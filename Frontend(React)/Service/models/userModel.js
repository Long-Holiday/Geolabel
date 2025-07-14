const knex = require("../utils/knex");
// 创建用户
async function createUser(user) {
  return knex("user").insert(user);
}

// 密码登录
const findByUsernameAndPassword = async (username, userpassword) => {
  return knex("user").select().where({ username, userpassword });
};
// 重置密码
const resetPassword = async (userid, userpassword) => {
  return knex("user").update({ userpassword }).where({ userid });
};
const getUsersByAdmin = (isAdmin) => {
  return knex("user").select().where({ isadmin: isAdmin });
};

const getUsersCountByAdmin = (isAdmin) => {
  return knex("user").count("* as count").where({ isadmin: isAdmin }).first();
};
const getAllRoles = () => {
  return knex("role").select();
};
const updateUser = (userid, updates) => {
  return knex("user").where({ userid }).update(updates);
};
const deleteUserById = (userid) => {
  return knex("user").del().where({ userid });
};
module.exports = {
  createUser,
  findByUsernameAndPassword,
  resetPassword,
  getUsersByAdmin,
  getUsersCountByAdmin,
  getAllRoles,
  updateUser,
  deleteUserById,
};
