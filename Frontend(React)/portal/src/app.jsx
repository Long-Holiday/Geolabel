import { PageLoading } from '@ant-design/pro-layout';
import { history, request } from 'umi';
import RightContent from '@/components/RightContent';
import { currentState as queryCurrentUser } from './services/login/api';
import { message } from 'antd';
import logo from '@/assets/logo.png';
import logoSVG from '@/assets/LUUlogo.svg';

const loginPath = '/user/login';
/** 获取用户信息比较慢的时候会展示一个 loading */
export const initialStateConfig = {
  loading: <PageLoading />,
};
/**
 * @see  https://umijs.org/zh-CN/plugins/plugin-initial-state
 * */

export async function getInitialState() {
  const fetchUserInfo = async () => {
    try {
      const msg = await queryCurrentUser();
      if (msg.currentUser) {
        return msg;
      }
    } catch (error) {
      history.push(loginPath);
    }
    // 如果是登录页面，不执行
    return undefined;
  };
  // 如果当前路径不是登录页面
  if (history.location.pathname !== loginPath) {
    const currentUser = await fetchUserInfo();
    // 返回 fetchUserInfo 方法和当前用户的信息
    return {
      fetchUserInfo,
      currentState: currentUser,
      settings: {},
    };
  }

  return {
    fetchUserInfo,
    settings: {},
  };
} // ProLayout 支持的api https://procomponents.ant.design/components/layout

export const layout = ({ initialState }) => {
  return {
    logo: logoSVG,
    rightContentRender: () => <RightContent />,
    disableContentMargin: false,
    // 头像水印
    waterMarkProps: {
      content: initialState?.currentState?.currentUser,
    },
    // 侧边栏收缩功能
    collapsedButtonRender: false, // 使用默认的收缩按钮
    onPageChange: () => {
      const { location } = history; // 如果没有登录，重定向到 login
      if (!initialState.currentState && !location.pathname.includes('user/')) {
        message.error('请先登录！');
        history.push(loginPath);
      }
    },

    menuHeaderRender: undefined,
    // 自定义 403 页面
    // unAccessible: <div>unAccessible</div>,
    ...initialState?.settings,
  };
};
