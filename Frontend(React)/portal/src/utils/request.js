// A highlighted block
/**
 * request 网络请求工具
 * 更详细的 api 文档: https://github.com/umijs/umi-request
 */
import { extend } from 'umi-request';
import { notification, message } from 'antd';
import { getCookie,setCookie,removeCookie } from '@/utils/cookie'
import {boolean} from "mockjs/src/mock/random/basic";

const codeMessage = {
  200: '服务器成功返回请求的数据。',
  201: '新建或修改数据成功。',
  202: '一个请求已经进入后台排队（异步任务）。',
  204: '删除数据成功。',
  400: '发出的请求有错误，服务器没有进行新建或修改数据的操作。',
  401: '用户没有权限（令牌、用户名、密码错误）。',
  403: '用户得到授权，但是访问是被禁止的。',
  404: '发出的请求针对的是不存在的记录，服务器没有进行操作。',
  405: '请求方法不被允许。',
  406: '请求的格式不可得。',
  410: '请求的资源被永久删除，且不会再得到的。',
  422: '当创建一个对象时，发生一个验证错误。',
  500: '服务器发生错误，请检查服务器。',
  502: '网关错误。',
  503: '服务不可用，服务器暂时过载或维护。',
  504: '网关超时。',
};

/**
 * 异常处理程序
 */
const errorHandler = error => {
  const { response } = error;

  if (response && response.status) {
    const errorText = codeMessage[response.status] || response.statusText;
    const { status, url } = response;
    notification.error({
      message: `请求错误 ${status}: ${url}`,
      description: errorText,
    });
  }

  return response;
};
const request = extend({
  errorHandler,
  // 默认错误处理
  credentials: 'include', // 默认请求是否带上cookie

});

// 请求拦截器
request.interceptors.request.use((url, options) => {
  try {
    // 如果接口是登录和注册放行
    if (url === '/wegismarkapi/user/login'||url === '/wegismarkapi/user/register') {
      return {
        url: `${url}`,
        options: { ...options, interceptors: true },
      };
    } else {
      if (getCookie('TOKEN') == '' || getCookie('TOKEN') == null) {
        message.error("TOKEN 丢失，请重新登录");
        // history.push('/user/login'); // 注释掉这一行，因为history可能未定义
        // 平阻断请求 （暂时未写）
        return {
          url: `${url}`,
          options: { ...options, interceptors: true },
        };
      } else {
        //请求geoserver服务，header不需要token，避免被覆盖
        if (url.includes("api3")){
          return (
            {
              url: `${url}`,
              options: { ...options,  interceptors: true },
            }
          );
        }
        // 后端请求头添加token
        let TOKEN = getCookie('TOKEN');

        let headers = {
          'token': TOKEN
        };
        return (
          {
            url: `${url}`,
            options: { ...options, headers: headers,  interceptors: true },
          }
        );
      }
    }
  }catch (e){
    console.log("请求拦截报错"+e)
    return {
      url: `${url}`,
      options: { ...options, interceptors: true },
    };
  }
});

// 响应拦截器
request.interceptors.response.use(async response => {
  try {
    // 检查Content-Type是否为JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.clone().json();
      if (data.message==="token过期"){
        removeCookie("TOKEN")
      }
      //登录响应
      if (data.data && data.data.token !== undefined){
        setCookie("TOKEN",data.data.token)
      }
    }
  }catch (e) {
    console.log("响应拦截报错"+e)
    // 不要阻止非JSON响应继续处理
  }finally {
    return response;
  }
});


export default request;
