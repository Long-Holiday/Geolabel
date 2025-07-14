const UserModel = require("../models/userModel");
const md5 = require("../utils/md5");

const register = async (ctx, next) => {
  const { userName: username, userPassword } = ctx.request.body;
  const userpassword = md5(userPassword); // 加密
  try {
    await UserModel.createUser({ username, userpassword });
    ctx.body = { code: 200, info: "注册成功！" };
    console.log("注册成功，账号：", username, "密码：", userpassword);
  } catch (error) {
    if (error.code == 23505) {
      ctx.body = { code: error.code, info: "用户名重复" };
    } else {
      ctx.body = { code: error.code, info: "注册失败" };
    }
  }
};
const login = async (ctx, next) => {
  const { userName: username, userPassword, autoLogin } = ctx.request.body;
  const userpassword = md5(userPassword); // 加密
  try {
    const rows = await UserModel.findByUsernameAndPassword(
      username,
      userpassword
    );
    if (rows.length === 1) {
      if (!autoLogin) {
        console.log("不自动登录");
        ctx.session.maxAge = 0;
      }
      ctx.session.user = {
        userName: rows[0].username,
        isAdmin: rows[0].isadmin,
      };
      ctx.body = { code: 200, info: "登录成功！" };
    } else {
      ctx.body = { code: 403, info: "用户名或密码错误!" };
      console.log("用户名或密码错误！");
    }
  } catch (error) {
    ctx.body = { code: 500, info: "登录失败" };
    console.log("登录失败:", error);
  }
};
const resetPassword = async (ctx, next) => {
  const { userid } = ctx.request.body;
  const userpassword = md5("88888888"); //加密
  await UserModel.resetPassword(userid, userpassword);
  ctx.body = { code: 200, info: "修改成功！" };
  console.log("重置成功!密码:", userpassword);
};
const getUsers = async (ctx, next) => {
  const {
    query: { isAdmin, current, pageSize, userid, username },
  } = ctx;

  try {
    const sum = await UserModel.getUsersCountByAdmin(isAdmin);

    let query = UserModel.getUsersByAdmin(isAdmin)
      .select("userid", "username", "isadmin", "finishednum", "unfinishednum")
      .orderBy("userid")
      .limit(pageSize)
      .offset(pageSize * (current - 1));

    if (userid) {
      query = query.where({ userid });
    }
    if (username) {
      query = query.where({ username });
    }

    const rows = await query;
    console.log(sum);
    ctx.body = {
      code: 200,
      data: rows,
      success: true,
      total: userid || username ? rows.length : sum.count,
    };
  } catch (error) {
    ctx.body = { code: 500, info: "获取用户列表失败" };
    console.log("获取用户列表失败:", error);
  }
};
const getRoles = async (ctx, next) => {
  try {
    const roles = await UserModel.getAllRoles();
    ctx.body = { code: 200, list: roles };
  } catch (error) {
    ctx.body = { code: 500, info: "获取角色列表失败" };
    console.log("获取角色列表失败:", error);
  }
};
const updateUser = async (ctx, next) => {
  const { userid, username, isadmin } = ctx.request.body;
  try {
    await UserModel.updateUser(userid, { username, isadmin });
    ctx.body = { code: 200, info: "修改成功！" };
  } catch (error) {
    if (error.code === 23505) {
      ctx.body = { code: error.code, info: "用户名重复" };
    } else {
      ctx.body = { code: 500, info: "修改用户失败" };
    }
    console.log("修改用户失败:", error);
  }
};
const outLogin = (ctx, next) => {
  ctx.session.user = null;
  ctx.body = { code: 200, info: "退出登录!" };
};
const getCurrentState = (ctx, next) => {
  const {
    session: { user },
  } = ctx;
  if (user) {
    ctx.body = { currentUser: user.userName, isAdmin: user.isAdmin };
  } else {
    ctx.body = null;
  }
};
const deleteUser = async (ctx, next) => {
  const { userid } = ctx.params;
  await UserModel.deleteUserById(userid);
  console.log("删除用户成功！");
  ctx.body = { code: 200 };
};
module.exports = {
  register,
  login,
  resetPassword,
  getUsers,
  getRoles,
  updateUser,
  outLogin,
  getCurrentState,
  deleteUser,
};
