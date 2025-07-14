import CryptoJS from 'crypto-js';
import moment from 'moment';

const key = CryptoJS.enc.Utf8.parse('AOWQ4P0YEC4YXUKS'); //十六位十六进制数作为密钥
const iv = CryptoJS.enc.Utf8.parse('O3V2GCL1K2HNZ9Y7'); //十六位十六进制数作为密钥偏移量
//解密方法
export function Decrypt(word) {
  const encryptedHexStr = CryptoJS.enc.Hex.parse(word);
  const srcs = CryptoJS.enc.Base64.stringify(encryptedHexStr);
  const decrypt = CryptoJS.AES.decrypt(srcs, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const decryptedStr = decrypt.toString(CryptoJS.enc.Utf8);
  return decryptedStr.toString();
}

//加密方法
export function Encrypt(word) {
  const srcs = CryptoJS.enc.Utf8.parse(word);
  const encrypted = CryptoJS.AES.encrypt(srcs, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return encrypted.ciphertext.toString().toUpperCase();
}
// 跳转标注页面
export const jumpRoutesInNewPage = (pathname) => {
  //http://localhost:8000/#/resultsmgmt
  let url = window.location.href;
  url = url.substring(0, url.lastIndexOf('/'));
  let link = document.createElement('a');
  //http://localhost:8000/#/pathname
  link.href = url + pathname;
  //新页面打开
  link.target = '_blank';
  // Chrome Edga rel="opener"  不丢失sessionStorage
  // 其他浏览器未测试
  link.rel = 'opener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
// 获取当前时间
export const getNowTime = () => {
  let time = new Date();
  console.log(time.toLocaleString());
  time =
    time.toLocaleString().split(' ')[0].split('/').join('-') +
    ' ' +
    time.toLocaleString().split(' ')[1];
  return time;
};
//本地浏览器存储方法
export const storage = {
  get: (name) => {
    return localStorage.getItem(name);
  },
  set: ({ name, data }) => {
    localStorage.setItem(name, data);
  },
  clearItem: (name) => {
    localStorage.removeItem(name);
  },
  clear: () => {
    localStorage.clear();
  },
};
//时间格式化方法
export const formatTime = (time) => {
  return moment(time).format('YYYY-MM-DD HH:mm:ss');
};
