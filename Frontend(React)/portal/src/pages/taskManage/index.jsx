import {
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  ExpandOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-layout';
import { ProTable, TableDropdown } from '@ant-design/pro-table';
import { useModel, history } from 'umi';
import { Button, message, Popconfirm, Select, Tag } from 'antd';
import { useRef, useState, useEffect } from 'react';
import {
  reqGetTaskList,
  reqNewTask,
  reqDeleteTask,
  reqEditTask,
} from '@/services/taskManage/api.js';
// 引入封装的跳转方法
import { Encrypt } from '@/utils/utils.js';

// 引入封装模态框表单
import CollectionCreateForm from './components/index.jsx';
import { reqGenerateDataset } from '@/services/map/api.js';
// #region

const taskManage = () => {
  const actionRef = useRef();
  // 控制模态框显示影藏
  const [visible, setVisible] = useState(false);
  const [defaultValue, setDefaultValue] = useState({});
  //获取服务列表
  const { serverList, getServerList, getServerListBySetName, serverListBySetName } = useModel('serverModel');
  const { userList, getUserList } = useModel('userModel');
  const { getTypeInfo, typeList } = useModel('typeModel');
  
  // 获取当前用户信息
  const { initialState } = useModel('@@initialState');
  const { currentState } = initialState || {};
  const isAdmin = currentState?.isAdmin === 1;
  const currentUserScore = currentState?.score || 0; // 直接从currentState获取积分
  
  // 使用useEffect钩子，避免重复渲染导致的重复请求
  useEffect(() => {
    // 控制台日志会导致额外的渲染，注释掉
    // console.log('Current user state:', currentState);
    // console.log('Current user score:', currentUserScore);
  }, [currentState, currentUserScore]);

  // 新建参数收集
  const onCreate = async (values) => {
    let { daterange, taskid, taskname, type, mapserver, targetUserType, score } = values;
    
    // 确保score是数字
    score = typeof score === 'number' ? score : Number(score) || 0;
    
    // 判断是否为非团队任务
    const isNonTeamTaskLogic = targetUserType === 'allNonAdminUsers' || targetUserType === 'allNonTeamUsers';
    
    // 如果是单个底图服务直接处理
    if (!Array.isArray(mapserver) || mapserver.length === 0) {
      message.error('请至少选择一个底图服务');
      return;
    }
    
    // 如果是非团队任务且设置了积分，进行积分检查
    if (isNonTeamTaskLogic && score > 0) {
      const totalScoreToDeduct = mapserver.length * score;
      if (currentUserScore < totalScoreToDeduct) {
        message.error(`积分不足！您需要 ${totalScoreToDeduct} 积分来发布这些任务，但您只有 ${currentUserScore} 积分。`);
        return; // 终止操作
      }
    }
    
    const hide = message.loading('正在添加任务');
    try {
      // 多底图服务处理 - 为每个底图服务创建一个任务
      let successCount = 0;
      let failCount = 0;
      
      // 循环处理每个底图服务
      for (let i = 0; i < mapserver.length; i++) {
        const currentMapServer = mapserver[i];
        // 如果有多个底图服务，任务名添加序号
        const currentTaskName = mapserver.length > 1 
        ? `${taskname}_${currentMapServer}` 
        : taskname;
      
        // // 使用原始任务名称，不再添加底图服务名称作为后缀
        // const currentTaskName = taskname;
        
        // 构建当前任务的请求参数
        let requestValues = {};
        
        // 处理日期范围
        let map = daterange.map(item => {
          return item.format('YYYY-MM-DD');
        });
        
        // 构建请求基本参数
        requestValues["daterange"] = map;
        requestValues["taskname"] = currentTaskName;
        requestValues["type"] = type;
        requestValues["mapserver"] = currentMapServer;
        requestValues["taskid"] = taskid;
        
        // 添加积分值到请求参数
        if (isNonTeamTaskLogic && score > 0) {
          requestValues["score"] = score;
        }
        
        // 设置目标用户类型，普通用户固定为allNonAdminUsers
        requestValues["targetUserType"] = isAdmin ? targetUserType : "allNonAdminUsers";
        
        // 根据目标用户类型处理特定参数
        if (isAdmin && targetUserType === "specificTeamUsers") {
          // 处理特定用户分配信息
          const userArr = [];
          const specificUserAssignments = values.specificUserAssignments || [];
          
          // 构建传统userArr格式，兼容后端
          specificUserAssignments.forEach(assignment => {
            const username = assignment.username;
            const typeArr = assignment.typeArr;
            
            // 处理类型ID
            let typeIdArr = typeArr.map(typeItem => {
              var n = Number(typeItem);
              if (!isNaN(n)) {
                return typeItem;
              } else {
                let typeObj = typeList.find(obj => obj.typeName === typeItem);
                return typeObj ? typeObj.typeId : typeItem;
              }
            });
            
            // 拼接格式: username,typeId1,typeId2...
            let typeStr = typeIdArr.join(",");
            userArr.push(username + ',' + typeStr);
          });
          
          requestValues["userArr"] = userArr;
          
          // 同时也传递specificUserAssignments用于后端处理
          requestValues["specificUserAssignments"] = specificUserAssignments;
        } else {
          // 对于"所有团队成员"或"所有非团队用户"或普通用户发布任务
          requestValues["selectedSampleTypes"] = values.selectedSampleTypes || values.uniformSampleTypes || [];
        }
        
        // 发送请求创建任务
        let result;
        if (taskid) {
          console.log('编辑');
          result = await reqEditTask(requestValues);
        } else {
          result = await reqNewTask(requestValues);
        }
        
        if (result.code == 200) {
          successCount++;
        } else {
          failCount++;
        }
      }
      
      hide();
      setVisible(false);
      setDefaultValue({});
      
      // 根据成功和失败数量显示消息
      if (successCount > 0 && failCount === 0) {
        message.success(`成功创建${successCount}个底图任务！`);
      } else if (successCount > 0 && failCount > 0) {
        message.warning(`部分底图任务创建成功，成功${successCount}个，失败${failCount}个`);
      } else {
        message.error('所有底图任务创建失败！');
        return false;
      }
      
      // 重新加载任务列表
      actionRef.current.reload();
    } catch (error) {
      hide();
      console.error('操作失败！', error);
      message.error('操作失败！');
      return false;
    }
  };
  
  // 控制机构列表数据展示
  const newOrEditTask = async () => {
    setVisible(true);
    // 获取用户的名称，仅在必要时获取数据
    if (typeList.length === 0) {
      getTypeInfo();
    }
    
    if (userList.length === 0) {
      getUserList({ isAdmin: 0 });
    }
    
    // 已经在serverModel中添加了缓存机制，这里可以直接调用
    getServerList();
    getServerListBySetName();
  };
  const confirm = async (id) => {
    try {
      await reqDeleteTask(id);
      // 修改数据数量，不然会报错
      actionRef.current.pageInfo.total -= 1;
      actionRef.current.reloadAndRest();
      message.success('删除成功！');
    } catch (error) {
      message.error('删除失败！');
    }
  };
  // 新建任务获取机构下拉框
  const renderUserList = userList.map(({ userid, username }) => {
    return {
      value: username,
      label: username,
    };
  });
  // 新建任务获取服务下拉框
  let renderServiceList = serverList.map((service) => {
    return (
      <Select.Option value={service.serName} key={service.serName}>
        {service.serName}
      </Select.Option>
    );
  });
  const columns = [
    {
      title: '序号',
      dataIndex: 'index',
      key: 'indexBorder',
      width: '5%',
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
      ellipsis: false,
      width: '15%',
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
      disable: true,
      // width: '20%',
      align: 'center',
      title: '底图服务',
      ellipsis: false,
      dataIndex: 'mapserver',
      key: 'mapserver',
      search: false,
      editable: false,
      render: (text) => {
        // 确保显示完整的底图服务名称
        return <span title={text}>{text}</span>;
      },
    },
    {
      width: '10%',
      align: 'center',
      title: '任务期限区间',
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
      width: 120,
      editable: false,
      search: true,
      dataIndex: 'status',
      key: 'status',
      sorter: true,
      sortOrder: 'status',
      valueType: 'select',
      fieldProps: {
        placeholder: '请选择状态',
        allowClear: true,
        options: [
          {
            label: '审核中',
            value: 0,
          },
          {
            label: '审核通过',
            value: 1,
          },
          {
            label: '审核未通过',
            value: 2,
          },
          {
            label: '未提交',
            value: 3,
          },
        ],
      },
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
          <Tag color={color} icon={icon}>
            {text}
          </Tag>
        );
      },
    },
    {
      title: '操作',
      width: '10%',
      align: 'center',
      // dataIndex: 'unitid',
      valueType: 'option',
      render: (text, record, index, action) => [
        <a
          key="editable"
          onClick={() => {
            setDefaultValue(record);
            newOrEditTask();
          }}
        >
          编辑
        </a>,
        <Popconfirm
          title="你确定要删除吗?"
          onConfirm={() => {
            confirm(record.taskid);
          }}
          okText="是"
          cancelText="否"
          key={'confirm'}
        >
          <a key="delete">删除</a>
        </Popconfirm>,
        record.status == 1 ? (
          <Button
            type="primary"
            key={'generateDataset'}
            onClick={async () => {
              try {
                const { taskid } = record;
                
                // 获取当前用户信息
                console.log('currentState:', currentState);
                
                // 从不同可能的字段中获取userId
                let userId;
                if (typeof currentState.currentUser === 'string') {
                  // 如果currentUser是字符串，使用默认值
                  userId = 10; // 默认用户ID
                  console.log('使用默认用户ID:', userId);
                } else {
                  // 尝试从currentUser对象中获取userId
                  userId = currentState.currentUser?.userid || 
                           currentState.currentUser?.user_id || 
                           currentState.currentUser?.id || 10;
                  console.log('从currentUser中获取用户ID:', userId);
                }
                
                const hide = message.loading('后台生成样本集中，请稍后查看');
                const result = await reqGenerateDataset({ taskid, userId });
                if (result.code == 200) {
                  hide();
                  message.success('样本已生成，请前往样本库查看！');
                } else if (result.code == 409) {
                  hide();
                  message.info('样本库中已有该样本集');
                } else {
                  hide();
                  message.error('样本生成失败，请联系管理员！');
                }
              } catch (error) {
                message.error('样本生成失败，请联系管理员！');
              }
            }}
          >
            <CheckCircleOutlined />
            生成样本
          </Button>
        ) : (
          <Button
            onClick={async () => {
              let taskId = Encrypt(record.taskid);
              try {
                window.sessionStorage.setItem('taskId', taskId);
                history.push('/map');
              } catch (error) {
                message.error('底图服务加载失败或不存在');
              }
            }}
            key="startAudit"
            type="primary"
            disabled={record.status > 1}
          >
            <ExpandOutlined /> 开始审核
          </Button>
        ),
      ],
    },
  ];
  const editable = {
    type: 'multiple',
    // 保存的回调
    onSave: async (key, row, originRow) => {
      console.log("修改");
      console.log(row);
      try {
        let result = await reqEditTask(row);
        if (result) {
          message.success('修改成功！');
          actionRef.current.reload();
        }
      } catch (error) {
        message.error('修改失败,请检查数据是否存在！');
        row = originRow;
        actionRef.current.reload();
        return false;
      }
    },
    onDelete: async (_, row, index, action) => {
      console.log(row.taskid);
      try {
        let result = await reqDeleteTask(row.taskid);
        // 修改数据数量，不然会报错
        actionRef.current.pageInfo.total -= 1;
        actionRef.current.reloadAndRest();
        message.success('删除成功！');
        console.log(actionRef.current);
      } catch (error) {
        message.error('删除失败！');
      }
    },
  };
  return (
    <PageContainer>
      <ProTable
        rowKey="taskid" // 设置唯一标识符
        columns={columns}
        actionRef={actionRef}
        request={async (params, sorter, filter) => {
          // 获取任务列表数据
          const data = await reqGetTaskList(params, sorter, filter);
          
          // 对数据进行排序，使"审核中"(status=0)的记录排在前面
          if (data && data.data) {
            data.data.sort((a, b) => {
              // 如果a是审核中状态(0)而b不是，a排在前面
              if (a.status === 0 && b.status !== 0) return -1;
              // 如果b是审核中状态(0)而a不是，b排在前面
              if (b.status === 0 && a.status !== 0) return 1;
              // 其他情况保持原有顺序
              return 0;
            });
          }
          
          return data;
        }}
        editable={editable}
        search={{
          labelWidth: 'auto',
        }}
        pagination={{
          pageSizeOptions: ['10', '20', '30', '50'],
          defaultPageSize: 10,
          showSizeChanger: true,
        }}
        headerTitle="任务管理"
        // 添加防抖和缓存配置
        debounceTime={300}
        revalidateOnFocus={false} // 防止页面获得焦点时重新请求
        polling={false} // 禁用轮询
        toolBarRender={() => [
          <Button key="button" icon={<PlusOutlined />} type="primary" onClick={newOrEditTask}>
            新建
          </Button>,
        ]}
      />
      {visible && (
        <CollectionCreateForm
          open={visible}
          defaultValue={defaultValue}
          onCreate={onCreate}
          onCancel={() => {
            setVisible(false);
            setDefaultValue({});
          }}
          renderUserList={renderUserList}
          renderServiceList={renderServiceList}
          renderTypeList={typeList}
        />
      )}
      ,
    </PageContainer>
  );
};

export default taskManage;
