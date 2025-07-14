import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { message, Tabs, Radio } from 'antd';
import React, { useState } from 'react';
import { history, SelectLang } from 'umi';
import styles from './index.less';
import { LoginForm, ProFormText, ProFormRadio } from '@ant-design/pro-form';
import logo from '@/assets/logo.png';
import logoSVG from '@/assets/LUUlogo.svg';
import backgroundImg from '@/assets/background.jpg';
import { register } from '@/services/register/api';

const Register = () => {
  const [type, setType] = useState('account');

  // 表单提交
  const handleSubmit = async (values) => {
    const { userName, userPassword, checkPassword, isAdmin } = values;
    // 校验
    if (userPassword != checkPassword) {
      message.error('两次输入的密码不一致');
      return;
    }
    try {
      // 注册
      const result = await register({ userName, userPassword, isAdmin });
      if (result) {
        const defaultLoginSuccessMessage = result.message;
        if (result.code != 200) {
          message.error(defaultLoginSuccessMessage);
        } else {
          message.success(defaultLoginSuccessMessage);
          if (!history) return;
          const { query } = history.location;
          history.push({
            pathname: '/user/login',
            query,
          });
          return;
        }
      }
    } catch (error) {
      const defaultLoginFailureMessage = '注册失败，请重试！';
      message.error(defaultLoginFailureMessage);
    }
  };

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
            <li>快速注册，立即开始标注工作</li>
            <li>支持多种用户角色权限管理</li>
            <li>专业的遥感数据处理能力</li>
            <li>安全可靠的数据存储保护</li>
          </ul>
        </div>
      </div>

      {/* 右侧注册表单区域 */}
      <div className={styles.rightSection}>
        <div className={styles.content}>
          <LoginForm
            submitter={{
              searchConfig: {
                submitText: '注册',
              },
            }}
            logo={<img alt="logo" src={logoSVG} />}
            title="众智标绘"
            subTitle={'欢迎注册遥感样本标注平台'}
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
              items={[{ label: '账号密码注册', key: 'account' }]}
            />
            {type === 'account' && (
              <>
                <ProFormText
                  name="userName"
                  fieldProps={{
                    size: 'large',
                    prefix: <UserOutlined className={styles.prefixIcon} />,
                  }}
                  placeholder="请输入账号"
                  rules={[
                    {
                      required: true,
                      message: '账号是必填项！',
                    },
                  ]}
                />
                <ProFormText.Password
                  name="userPassword"
                  fieldProps={{
                    size: 'large',
                    prefix: <LockOutlined className={styles.prefixIcon} />,
                  }}
                  placeholder="请输入密码"
                  rules={[
                    {
                      required: true,
                      message: '密码是必填项！',
                    },
                    {
                      min: 3,
                      message: '长度不能小于 3',
                    },
                  ]}
                />
                <ProFormText.Password
                  name="checkPassword"
                  fieldProps={{
                    size: 'large',
                    prefix: <LockOutlined className={styles.prefixIcon} />,
                  }}
                  placeholder="请再次输入密码"
                  rules={[
                    {
                      required: true,
                      message: '确认密码是必填项！',
                    },
                    {
                      min: 3,
                      message: '长度不能小于 3',
                    },
                  ]}
                />
                <ProFormRadio.Group
                  name="isAdmin"
                  label="用户类型"
                  options={[
                    {
                      label: '普通用户',
                      value: 0,
                    },
                    {
                      label: '管理员',
                      value: 1,
                    },
                  ]}
                  initialValue={0}
                  rules={[
                    {
                      required: true,
                      message: '请选择用户类型！',
                    },
                  ]}
                />
              </>
            )}
          </LoginForm>
        </div>
      </div>
    </div>
  );
};

export default Register;
