const knex = require("knex")({
  client: "pg",
  connection: {
    host: "localhost",
    user: "postgres",
    password: "123456",
    database: "lable",
  },
});

module.exports = knex;
