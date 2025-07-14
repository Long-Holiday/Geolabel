const knex = require("../utils/knex");
const createServer = (sername, serdesc, seryear, publisher, publishtime) => {
  return knex("server").insert({
    sername,
    serdesc,
    seryear,
    publisher,
    publishtime,
  });
};

const getServers = () => knex("server").select();

const deleteServerByName = (sername) => knex("server").del().where({ sername });

module.exports = {
  createServer,
  getServers,
  deleteServerByName,
};
