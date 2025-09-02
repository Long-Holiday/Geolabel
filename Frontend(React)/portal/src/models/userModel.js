import { reqGetUserList, reqRoleList } from '@/services/userManage/api';
import { message } from 'antd';
import { useState, useCallback } from 'react';

export default function userModel() {
  const [roleList, setRoleList] = useState([]);
  const [userList, setUserList] = useState([]);

  // useEffect(async () => {

  // }, []);
  const getRoleList = useCallback(async () => {
    try {
      let result = await reqRoleList();
      //用户列表
      if (result.code) {
        setRoleList(result.list);
        console.log(result.list, '角色列表');
      }
    } catch (error) {
      message.error('获取角色列表失败！');
      console.log(error);
    }
  });
  const getUserList = useCallback(async (role) => {
    try {
      let result = await reqGetUserList(role);
      //用户列表
      if (result.code) {
        setUserList(result.data);
        console.log(result.data, '用户列表');
      }
    } catch (error) {
      message.error('获取用户列表失败！');
      console.log(error);
    }
  });
  // const signin = useCallback((account, password) => {
  // signin implementation
  // setUser(user from signin API)
  // }, []);

  // const signout = useCallback(() => {
  // signout implementation
  // setUser(null)
  // }, []);

  return {
    // user,
    // signin,
    // signout,
    roleList,
    getRoleList,
    userList,
    getUserList,
  };
}
