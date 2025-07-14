const axios = require("axios");

// create an axios instance
const request = axios.create({
  baseURL: "http://localhost:8081/geoserver", // url = base url + request url
  // withCredentials: false, // send cookies when cross-domain requests
  //   timeout: 5000, // request timeout
  // headers: {
  //   Authorization:
  //     "Basic " +
  //     Buffer.from("admin" + ":" + "geoserver").toString("base64"),
  // },
});

module.exports = request;
