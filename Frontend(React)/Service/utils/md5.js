const crypto = require("crypto");

function md5(str) {
  const hash = crypto.createHash("md5");
  hash.update(str);
  return hash.digest("hex"); //16进制
}

module.exports = md5;
