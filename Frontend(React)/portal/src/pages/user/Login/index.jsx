import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, message, Tabs } from 'antd';
import { useState } from 'react';
import { ProFormText, LoginForm, ProFormCheckbox } from '@ant-design/pro-form';
import { useIntl, history, FormattedMessage, useModel, useAccess, SelectLang, Link } from 'umi';
import { login } from '@/services/login/api';
import styles from './index.less';
import logo from '@/assets/logo.png';
import LUUlogo from '@/assets/LUUlogo.png';
import logoSVG from '@/assets/LUUlogo.svg';
import backgroundImg from '@/assets/background.jpg';

const LoginMessage = ({ content }) => (
  <Alert
    style={{
      marginBottom: 24,
    }}
    message={content}
    type="error"
    showIcon
  />
);

const Login = () => {
  const [userLoginState, setUserLoginState] = useState({});
  const [type, setType] = useState('account');
  const { initialState, setInitialState } = useModel('@@initialState');
  const intl = useIntl();

  const fetchUserInfo = async () => {
    try {
      const userInfo = await initialState?.fetchUserInfo?.();
      if (userInfo) {
        await setInitialState((s) => ({ ...s, currentState: userInfo }));
      }
    } catch (error) {
      console.error("获取用户信息时发生错误:", error);
    }
  };

  const handleSubmit = async (values) => {
    try {
      const result = await login({ ...values });
      if (result.data.token) {
        const defaultLoginSuccessMessage = intl.formatMessage({
          id: 'pages.login.success',
          defaultMessage: '登录成功！',
        });
        message.success(defaultLoginSuccessMessage);
        await fetchUserInfo();
        if (!history) return;
        history.push('/home');
        return;
      } else {
        setUserLoginState(result);
      }
    } catch (error) {
      const defaultLoginFailureMessage = '登录失败，请重试！';
      message.error(defaultLoginFailureMessage);
      console.log(error);
    }
  };

  const { code } = userLoginState;

  return (
    <div className={styles.container}>
      {/* 语言选择器 */}
      <div className={styles.lang}>
        <SelectLang />
      </div>

      {/* 左侧背景区域 */}
      <div className={styles.leftSection}>
        <div className={styles.leftContent}>
          <div className={styles.title}>众智标绘</div>
          <div className={styles.subtitle}>AI辅助的遥感样本协作标注平台</div>
          <ul className={styles.features}>
            <li>智能AI辅助标注，提升标注效率</li>
            <li>多人协作标注，实时同步进度</li>
            <li>遥感影像专业处理工具</li>
            <li>高精度样本质量控制</li>
          </ul>
        </div>
      </div>

      {/* 右侧登录表单区域 */}
      <div className={styles.rightSection}>
        <div className={styles.content}>
          <div className={styles.loginform} />
          <LoginForm
            title="众智标绘"
            logo={<img alt="logo" src={logoSVG} />}
            subTitle={'欢迎登录遥感样本标注平台'}
            initialValues={{
              autoLogin: true,
            }}
            onFinish={async (values) => {
              await handleSubmit(values);
            }}
          >
            <Tabs
              activeKey={type}
              onChange={setType}
              items={[{ label: '账号密码登录', key: 'account' }]}
            />

            {code === 403 && <LoginMessage content={'账户或密码错误'} />}
            {type === 'account' && (
              <>
                <ProFormText
                  name="userName"
                  fieldProps={{
                    size: 'large',
                    prefix: <UserOutlined className={styles.prefixIcon} />,
                  }}
                  placeholder={'请输入账号'}
                  rules={[
                    {
                      required: true,
                      message: (
                        <FormattedMessage
                          id="pages.login.username.required"
                          defaultMessage="请输入用户名!"
                        />
                      ),
                    },
                  ]}
                />
                <ProFormText.Password
                  name="userPassword"
                  fieldProps={{
                    size: 'large',
                    prefix: <LockOutlined className={styles.prefixIcon} />,
                  }}
                  placeholder={'请输入密码'}
                  rules={[
                    {
                      required: true,
                      message: (
                        <FormattedMessage
                          id="pages.login.password.required"
                          defaultMessage="请输入密码！"
                        />
                      ),
                    },
                  ]}
                />
              </>
            )}
            <div
              style={{
                marginBottom: 24,
              }}
            >
              <ProFormCheckbox noStyle name="autoLogin">
                自动登录
              </ProFormCheckbox>
              <Link
                to="/user/register"
                style={{
                  float: 'right',
                }}
              >
                新用户注册
              </Link>
            </div>
          </LoginForm>
        </div>
      </div>
    </div>
  );
};

export default Login;
