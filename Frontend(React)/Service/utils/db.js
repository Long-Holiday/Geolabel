// 连接postgreSQL
var pgsql = require("pg");
var pool = new pgsql.Pool({
  host: "localhost",
  user: "postgres", // 数据库用户名
  password: "123456", // 数据库密码
  database: "label",
});

function query(sql) {
  return new Promise((resolve, reject) => {
    pool.connect(async (err, connection) => {
      let result;
      try {
        result = await connection.query(sql);
        resolve(result);
      } catch (error) {
        console.log("error:", error);
        resolve(error.code);
      }

      // if (result) {
      // } else {
      //   reject(err);
      // }
      connection.release();
    });
  });
}

exports.query = query;
