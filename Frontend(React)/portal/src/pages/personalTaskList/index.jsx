import { PageContainer } from '@ant-design/pro-layout';
import { ProTable } from '@ant-design/pro-table';
import { useModel, history, useAccess } from 'umi';
import { useState, useRef, useEffect } from 'react';
import { reqGetTaskList, reqStartMark, reqSubmitTask, reqGetPersonalTaskList } from '@/services/taskManage/api.js';
import { reqJoinTeam, reqGetCurrentUserInfo } from '@/services/teamManage/api.js';
import { Button, message, Popconfirm, Tag, Tooltip, Space, Checkbox, Row, Col } from 'antd';
import { Encrypt, jumpRoutesInNewPage } from '@/utils/utils';
import JoinTeamForm from './components/JoinTeamForm';
import ModelToolPanel from './components/ModelToolPanel';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExpandOutlined,
  InfoCircleOutlined,
  MinusCircleOutlined,
  SendOutlined,
  UserOutlined,
  TeamOutlined,
} from '@ant-design/icons';

const Category = () => {
  const actionRef = useRef();
  const [joinTeamVisible, setJoinTeamVisible] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [userTeamInfo, setUserTeamInfo] = useState(null); // 新增：用户团队信息
  const access = useAccess();
  
  // 多重解构获取当前用户名称
  const {
    initialState: {
      currentState: { currentUser, isAdmin },
    },
  } = useModel('@@initialState');
  
  // 新增：获取任务计数的函数
  const fetchTaskCounts = async () => {
    try {
      // 获取团队任务数量
      const teamResponse = await reqGetPersonalTaskList({
        userArr: currentUser,
        taskClass: 0,
        pageSize: 1000 // 获取所有数据用于计数
      });
      
      // 获取非团队任务数量
      const nonTeamResponse = await reqGetPersonalTaskList({
        userArr: currentUser,
        taskClass: 1,
        pageSize: 1000 // 获取所有数据用于计数
      });
      
      setTaskCounts({
        team: teamResponse?.total || 0,
        nonTeam: nonTeamResponse?.total || 0
      });
    } catch (error) {
      console.error('获取任务计数失败:', error);
    }
  };
  
  // 新增：获取用户团队信息的函数
  const fetchUserTeamInfo = async () => {
    try {
      const result = await reqGetCurrentUserInfo();
      if (result) {
        console.log('用户信息:', result);
        setUserTeamInfo(result);
      }
    } catch (error) {
      console.error('获取用户团队信息失败:', error);
    }
  };
  
  // 处理加入团队
  const handleJoinTeam = async (values) => {
    const hide = message.loading('正在加入团队...');
    try {
      const result = await reqJoinTeam(values);
      hide();
      if (result.code === 200) {
        message.success('加入团队成功！');
        setJoinTeamVisible(false);
        // 刷新页面数据
        if (actionRef.current) {
          actionRef.current.reload();
        }
        // 重新获取用户团队信息
        await fetchUserTeamInfo();
      } else {
        message.error(result.message || '加入团队失败！');
      }
    } catch (error) {
      hide();
      message.error('服务器异常，加入失败！');
    }
  };
  
  // 组件初始化时获取用户团队信息和任务计数
  useEffect(() => {
    fetchUserTeamInfo();
    fetchTaskCounts();
  }, [currentUser]);
  
  // 新增：处理任务选择
  const handleTaskSelection = (selectedRowKeys, selectedRows) => {
    setSelectedRowKeys(selectedRowKeys);
    setSelectedTasks(selectedRows);
  };
  
  // 新增：批量训练完成回调
  const handleBatchTrainComplete = (result) => {
    console.log('批量训练完成:', result);
    // 可以在这里添加刷新表格等操作
    if (actionRef.current) {
      actionRef.current.reload();
    }
  };
  
  // 新增：批量推理完成回调
  const handleBatchInferenceComplete = (results) => {
    console.log('批量推理完成:', results);
    // 可以在这里添加刷新表格等操作
    if (actionRef.current) {
      actionRef.current.reload();
    }
  };
  
  const columns = [
    {
      title: '序号',
      dataIndex: 'index',
      key: 'indexBorder',
      width: 60,
      search: false,
      editable: false,
      align: 'center',
      valueType: 'indexBorder',
    },
    {
      disable: true,
      title: '任务名称',
      dataIndex: 'taskname',
      key: 'taskname',
      ellipsis: true,
      width: 180,
      align: 'center',
      formItemProps: {
        rules: [
          {
            required: true,
            message: '此项为必填项',
          },
        ],
      },
    },
    {
      title: '标注类型',
      dataIndex: 'type',
      valueType: 'select',
      key: 'type',
      ellipsis: false,
      width: 100,
      align: 'center',
      search: false,
      formItemProps: {
        rules: [
          {
            required: true,
            message: '此项为必填项',
          },
        ],
      },
      fieldProps: {
        options: [
          {
            label: '目标检测',
            value: '目标检测',
          },
          {
            label: '地物分类',
            value: '地物分类',
          },
        ],
      },
    },

    {
      title: '任务积分',
      dataIndex: 'score',
      key: 'score',
      align: 'center',
      search: false,
      width: 100,
      render: (score, record) => {
        // 只在非团队任务中显示积分
        const taskClass = record.taskClass === null || record.taskClass === undefined ? 0 : record.taskClass;
        const isNonTeamTask = Number(taskClass) === 1;
        
        if (isNonTeamTask) {
          return (
            <Tag color="gold" style={{ fontSize: '12px' }}>
              {score || 0} 分
            </Tag>
          );
        }
        return '-';
      },
    },
    {
      disable: true,
      width: 150,
      align: 'center',
      title: '底图服务',
      ellipsis: true,
      dataIndex: 'mapserver',
      key: 'mapserver',
      search: false,
      editable: false,
    },
    {
      width: 160,
      align: 'center',
      title: '任务期限',
      dataIndex: 'daterange',
      key: 'daterange',
      ellipsis: false,
      valueType: 'dateRange',
      search: false,
      formItemProps: {
        rules: [
          {
            required: true,
            message: '此项为必填项',
          },
        ],
      },
    // 自定义渲染逻辑，这里假设后端返回的是逗号分隔的字符串
    renderText: (val) => (typeof val === 'string' ? val.split(' ') : val),
    },
    {
      align: 'center',
      title: '状态',
      width: 100,
      key: 'status',
      dataIndex: 'status',
      render: (_, record) => {
        let color, text, icon;
        switch (record.status) {
          case 0:
            text = '审核中';
            color = 'processing';
            icon = <ClockCircleOutlined />;
            break;
          case 1:
            text = '审核通过';
            color = 'success';
            icon = <CheckCircleOutlined />;
            break;
          case 2:
            text = '审核未通过';
            color = 'error';
            icon = <CloseCircleOutlined />;
            break;
          case 3:
            text = '未提交';
            color = '#BDBDBD';
            icon = <MinusCircleOutlined />;
            break;
          default:
            break;
        }
        return (
          <div>
            <Tag color={color} icon={icon} key={'status'} style={{ display: 'inline-block' }}>
              {text == '审核未通过' ? <Tooltip title={record.auditfeedback}>{text}</Tooltip> : text}
            </Tag>
          </div>
        );
      },
    },
    {
      title: '操作',
      width: 180,
      align: 'center',
      dataIndex: 'unitid',
      key: 'option',
      valueType: 'option',
      fixed: 'right',
      render: (text, record, index, action) => (
        <Space size="small">
          <Button
            size="small"
            onClick={async () => {
              let taskId = Encrypt(record.taskid);
              try {
                window.sessionStorage.setItem('taskId', taskId);
                jumpRoutesInNewPage(`/map`);
              } catch (error) {
                message.error('底图服务加载失败或不存在');
              }
            }}
            key="startDraw"
            disabled={record.status <= 1}
            icon={<ExpandOutlined />}
          >
            开始标注
          </Button>
          <Popconfirm
            title="提交审核中将无法修改"
            disabled={record.status <= 1}
            onConfirm={async () => {
              try {
                const { taskid } = record;
                const result = await reqSubmitTask({ taskid });
                if ((result.code === 200)) {
                  message.success('提交成功！');
                }
                actionRef.current.reload();
              } catch (error) {
                message.error('提交失败，请联系管理员！');
              }
            }}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              type="primary" 
              size="small"
              key="submit" 
              disabled={record.status <= 1}
              icon={<SendOutlined />}
            >
              提交任务
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  
  // 判断是否是普通用户
  const isNormalUser = !isAdmin || isAdmin === 0;
  
  // 定义任务类型选项卡
  const [activeTab, setActiveTab] = useState('0'); // 默认显示团队任务
  const [taskCounts, setTaskCounts] = useState({ team: 0, nonTeam: 0 });
  
  // 当切换选项卡时刷新表格数据和任务计数
  useEffect(() => {
    if (actionRef.current) {
      actionRef.current.reload();
    }
    // 切换选项卡时清空选择
    setSelectedRowKeys([]);
    setSelectedTasks([]);
    // 重新获取任务计数
    fetchTaskCounts();
  }, [activeTab]);

  // 新增：行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: handleTaskSelection,
    getCheckboxProps: (record) => ({
      disabled: false, // 所有任务都可以选择
      name: record.taskname,
    }),
  };
  
  return (
    <PageContainer>
      {/* 任务类型选项卡 */}
      <div style={{ marginBottom: 16 }}>
        <div className="task-tabs" style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', marginBottom: '16px' }}>
          <div 
            className={`tab-item ${activeTab === '0' ? 'active' : ''}`}
            onClick={() => setActiveTab('0')}
            style={{ 
              padding: '8px 16px', 
              cursor: 'pointer', 
              marginRight: '16px',
              borderBottom: activeTab === '0' ? '2px solid #1890ff' : 'none',
              color: activeTab === '0' ? '#1890ff' : 'inherit',
              fontWeight: activeTab === '0' ? 'bold' : 'normal',
            }}
          >
            <TeamOutlined /> 团队任务 ({taskCounts.team})
          </div>
          <div 
            className={`tab-item ${activeTab === '1' ? 'active' : ''}`}
            onClick={() => setActiveTab('1')}
            style={{ 
              padding: '8px 16px', 
              cursor: 'pointer',
              borderBottom: activeTab === '1' ? '2px solid #52c41a' : 'none',
              color: activeTab === '1' ? '#52c41a' : 'inherit',
              fontWeight: activeTab === '1' ? 'bold' : 'normal',
            }}
          >
            <UserOutlined /> 非团队任务 ({taskCounts.nonTeam})
          </div>
        </div>
      </div>

      {/* 优化：布局容器 */}
      <Row gutter={[16, 16]}>
        {/* 左侧：任务表格 */}
        <Col span={18}>
          <ProTable
            actionRef={actionRef}
            rowKey="taskid"
            search={false}
            rowSelection={rowSelection}
            request={async (params = {}) => {
              // 固定参数
              params.userArr = currentUser;
              // 添加任务类型过滤参数
              params.taskClass = parseInt(activeTab);
              
              // 使用获取分配给当前用户的任务的接口
              const response = await reqGetPersonalTaskList(params);
              
              return response;
            }}
            columns={columns}
            scroll={{ x: 'max-content' }}
            size="middle"
            pagination={{
              pageSizeOptions: ['10', '20', '30', '50'],
              defaultPageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
            }}
            expandable={{
              expandedRowRender: (record) => (
                <div style={{ padding: '8px 0' }}>
                  <p><strong>任务ID：</strong>{record.taskid}</p>
                  <p><strong>期限区间：</strong>{record.daterange}</p>
                  {record.auditfeedback && <p><strong>审核反馈：</strong>{record.auditfeedback}</p>}
                </div>
              ),
            }}
            toolBarRender={() => [
              // 只有普通用户且未加入团队时才显示加入团队按钮
              isNormalUser && (!userTeamInfo || !userTeamInfo.teamId) && (
                <Button
                  key="joinTeam"
                  type="primary"
                  icon={<TeamOutlined />}
                  onClick={() => setJoinTeamVisible(true)}
                >
                  加入团队
                </Button>
              ),
              // 如果用户已加入团队，显示团队信息
              userTeamInfo && userTeamInfo.teamId && (
                <Tag key="teamInfo" color="blue" icon={<TeamOutlined />} style={{ fontSize: '14px', padding: '4px 8px' }}>
                  团队：{userTeamInfo.teamName || `ID: ${userTeamInfo.teamId}`}
                </Tag>
              ),
            ]}
          />
        </Col>

        {/* 右侧：模型工具面板 */}
        <Col span={6}>
          <ModelToolPanel
            selectedTasks={selectedTasks}
            onBatchTrainComplete={handleBatchTrainComplete}
            onBatchInferenceComplete={handleBatchInferenceComplete}
          />
        </Col>
      </Row>

      {/* 加入团队表单 */}
      <JoinTeamForm
        visible={joinTeamVisible}
        onCancel={() => setJoinTeamVisible(false)}
        onJoin={handleJoinTeam}
      />
    </PageContainer>
  );
};

export default Category;
