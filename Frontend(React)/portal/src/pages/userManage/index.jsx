import { Tabs, Card, Button, message, Avatar, Select, Tree, Popconfirm } from 'antd';
// 引入头像icon
import { DeleteOutlined, EditOutlined, RedoOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons';
import React, { useState, useEffect } from 'react';
import { useModel, useAccess } from 'umi';
import { PageContainer } from '@ant-design/pro-layout';
import { ProCard, ProTable } from '@ant-design/pro-components';
import styles from './style.css';
import {
  reqGetUserList,
  reqNewUser,
  reqDeleteUser,
  reqEditUser,
  reqRoleList,
  reqResetPassword,
} from '@/services/userManage/api';
import { reqCreateTeam, reqGetMyTeamCode } from '@/services/teamManage/api';
import { getOrgList } from '@/services/orgManage/api';
import CollectionCreateForm from './components/index.jsx';
import CreateTeamForm from './components/CreateTeamForm.jsx';
import { useRef } from 'react';
import { defaultPadding } from 'ol/render/canvas';

const App = () => {
  // 控制机构列表数据展示
  const [orgCode, setOrgCode] = useState(1);
  const actionRef = useRef();
  const [visible, setVisible] = useState(false);
  const [teamFormVisible, setTeamFormVisible] = useState(false);
  const [initialValue, setInitialValue] = useState({});
  const [treeData, setTreeData] = useState([]);
  const [teamCode, setTeamCode] = useState(null);
  const { userList, getUserList } = useModel('userModel');
  const access = useAccess();

  const getRoleList = async () => {
    const result = await reqRoleList();
    if (result.code == 200) {
      let treeData = [];
      result.data.forEach((item, index) => {
        treeData.push({
          title: item.rolename,
          key: index,
        });
      });
      setTreeData(treeData);
    }
  };

  // 获取当前管理员的团队码
  const getMyTeamCode = async () => {
    if (access.canAdmin) {
      try {
        const result = await reqGetMyTeamCode();
        if (result.code == 200 && result.data) {
          setTeamCode(result.data.teamCode);
        }
      } catch (error) {
        console.error('获取团队码失败:', error);
      }
    }
  };

  useEffect(() => {
    getRoleList();
    getMyTeamCode();
  }, []);

  const onSelect = (selectedKeys, info) => {
    console.log(selectedKeys);
    setOrgCode(selectedKeys[0] ? 0 : 1);
  };

  const onCreate = async (values) => {
    const hide = message.loading('正在修改');
    setVisible(false);
    try {
      let result = await reqEditUser(values);
      hide();
      if (result.code == 200) {
        message.success('修改成功！');
        actionRef.current.pageInfo.total += 1;
        // 刷新并清空,页码也会重置，不包括表单
        actionRef.current.reload();
      } else {
        message.error('用户名重复！');
      }
    } catch (error) {
      hide();
      message.error('服务器异常，修改失败！');
      setVisible(false);
      return;
    }
  };

  // 创建团队处理
  const handleCreateTeam = async (values) => {
    const hide = message.loading('正在创建团队');
    setTeamFormVisible(false);
    try {
      const result = await reqCreateTeam(values);
      hide();
      if (result.code == 200) {
        message.success('团队创建成功！');
        setTeamCode(result.data.teamCode);
      } else {
        message.error(result.message || '创建失败！');
      }
    } catch (error) {
      hide();
      message.error('服务器异常，创建失败！');
      return;
    }
  };

  return (
    <PageContainer>
      <ProCard style={{ marginTop: 8 }} gutter={8} ghost>
        <ProCard colSpan={4} layout="left" bordered direction="column" className={styles.content}>
          <div className={styles.title}>众智标绘</div>
          <Tree
            defaultExpandAll={true}
            defaultSelectedKeys={[0]}
            onSelect={onSelect}
            treeData={treeData}
          />
          {/* </Access> */}
        </ProCard>
        <ProCard layout="left" bordered className={styles.content}>
          <div className={styles.title}>
            {/* 当前部门为：{unit} */}
            当前部门为：{orgCode ? '管理员' : '普通用户'}
            {visible && (
              <CollectionCreateForm
                defaultValue={initialValue}
                open={visible}
                onCreate={onCreate}
                onCancel={() => {
                  setVisible(false);
                }}
              />
            )}
            {teamFormVisible && (
              <CreateTeamForm
                visible={teamFormVisible}
                onCreate={handleCreateTeam}
                onCancel={() => {
                  setTeamFormVisible(false);
                }}
              />
            )}
          </div>
          {access.canAdmin && orgCode === 1 && (
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center' }}>
              <Button
                type="primary"
                icon={<TeamOutlined />}
                onClick={() => setTeamFormVisible(true)}
                style={{ marginRight: 16 }}
              >
                创建团队
              </Button>
              {teamCode && (
                <div style={{ marginLeft: 16 }}>
                  <strong>团队码:</strong> {teamCode}
                </div>
              )}
            </div>
          )}
          <div>
            <UserTable
              params={{ isAdmin: orgCode}}
              actionRef={actionRef}
              setVisible={setVisible}
              setInitialValue={setInitialValue}
              // setid={setid}
              // getDataSource={getDataSource}
            />
          </div>
          {/* <Access accessible={!access.canAdmin} fallback={<div>Can not delete foo.</div>}>
              Delete foo.
            </Access> */}
        </ProCard>
      </ProCard>
    </PageContainer>
  );
};


const UserTable = (props) => {
  const { setVisible, params, setInitialValue, actionRef } = props;

  const confirm = async (id) => {
    let res = await reqDeleteUser(id);
    if (res.code == 200) {
      message.success('删除成功');
      actionRef.current.reload();
    } else {
      message.error('删除失败，请联系管理员');
    }
  };

  const resetpwd = async (userid) => {
    let res = await reqResetPassword({ userid });
    if (res.code) {
      message.success('重置密码成功');
    } else {
      message.error('重置密码失败，请联系开发人员');
    }
  };

  const columns = [
    {
      title: '用户编号',
      dataIndex: 'userid',
      align: 'center',
      key: 'userid',
      valueType: 'digit',
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      align: 'center',
      ellipsis: true,
    },

    // {
    //   title: '已完成项目数',
    //   dataIndex: 'finishednum',
    //   key: 'finishednum',
    //   search: false,
    //   align: 'center',
    //   // ellipsis: false,
    // },
    // {
    //   title: '未完成项目数',
    //   dataIndex: 'unfinishednum',
    //   key: 'unfinishednum',
    //   search: false,
    //   align: 'center',
    //   // ellipsis: false,
    // },
    {
      title: '权限',
      dataIndex: 'isadmin',
      key: 'isadmin',
      valueEnum: { 1: '管理员', 0: '普通用户' },
      search: false,
      align: 'center',
    },
    {
      title: '操作',
      dataIndex: 'operate',
      search: false,
      align: 'center',
      // ellipsis: false,
      render: (text, record) => {
        return (
          <React.Fragment>
            <EditOutlined
              style={{ color: 'green', marginRight: '10px' }}
              title="修改"
              key="update"
              onClick={async () => {
                setInitialValue({
                  userid: record.userid,
                  isadmin: record.isadmin ? '管理员' : '普通用户',
                  username: record.username,
                });
                setVisible(true);
              }}
            />
            <Popconfirm
              title="你确定要删除吗?"
              onConfirm={() => {
                confirm(record.userid);
              }}
              okText="是"
              cancelText="否"
            >
              <DeleteOutlined
                key="delete"
                style={{ color: 'red', marginRight: '10px' }}
                title="删除"
              />
            </Popconfirm>
            <Popconfirm
              title="你确定要重置密码吗?"
              key="confirmReset"
              onConfirm={() => {
                resetpwd(record.userid);
              }}
              okText="是"
              cancelText="否"
            >
              <RedoOutlined style={{ color: '#1890ff' }} title="重置密码" key="reset" />
            </Popconfirm>
          </React.Fragment>
        );
      },
    },
  ];

  return (
    <ProTable
      params={params}
      request={reqGetUserList}
      /*request={async (
      )=>{
        const msg = await reqGetUserList({
          isAdmin: params.isAdmin,
          pageSize: params.pageSize,
          current: params.current,
          userid: params.userid,
          username: params.username,
        });
        debugger
        return {
          data: msg.data.usersPage.records,
          // success 请返回 true，
          // 不然 table 会停止解析数据，即使有数据
          success: msg.code===200?true:false,
          // 不传会使用 data 的长度，如果是分页一定要传
          total: msg.data.total,
        };
      }}*/
      columns={columns}
      actionRef={actionRef}
      rowKey="userid"
      pagination={{
        pageSizeOptions: ['5', '10', '15', '20'],
        defaultPageSize: 5,
        showSizeChanger: true,
      }}
    />
    // <Table rowKey="id" />
  );
};

export default App;
