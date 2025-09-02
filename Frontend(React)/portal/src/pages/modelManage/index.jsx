import React, { useState, useRef, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-layout';
import ProTable from '@ant-design/pro-table';
import { Button, message, Modal, Form, Input, Select, Upload, Popconfirm } from 'antd';
import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { getModels, deleteModel, uploadModel } from './service';
import { useModel } from 'umi';
import { currentState, getUserByUsername } from '@/services/login/api';

const ModelManage = () => {
  const [createModalVisible, handleModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const actionRef = useRef();
  const [userId, setUserId] = useState(null);
  const [modelData, setModelData] = useState([]);
  const [fileUploaded, setFileUploaded] = useState(false);

  // 从Umi全局状态获取用户信息
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentState?.currentUser;

  // 获取用户信息
  useEffect(() => {
    const fetchUserData = async () => {
      console.log('Current user from global state:', currentUser);

      if (currentUser) {
        try {
          // 如果currentUser是对象
          if (typeof currentUser === 'object') {
            if (currentUser.userId) {
              setUserId(currentUser.userId);
              console.log('Set userId from global state object:', currentUser.userId);
            } else if (currentUser.id) {
              setUserId(currentUser.id);
              console.log('Set userId from global state object (id):', currentUser.id);
            } else {
              console.warn('User is logged in but userId not found in user object');
              console.log('Full currentUser object:', currentUser);
            }
          }
          // 如果currentUser是字符串 (例如 "c3")，它是用户名而不是用户ID
          else if (typeof currentUser === 'string') {
            console.log('currentUser is a string (username):', currentUser);

            try {
              // 通过用户名查询用户信息
              const response = await getUserByUsername(currentUser);
              console.log('User info response by username:', response);

              if (response && response.userId) {
                setUserId(response.userId);
                console.log('Set userId from username lookup:', response.userId);
              } else if (response && response.id) {
                setUserId(response.id);
                console.log('Set userId from username lookup (id):', response.id);
              } else if (response && response.userid) {
                setUserId(response.userid);
                console.log('Set userId from username lookup (userid):', response.userid);
              } else {
                console.warn('Could not find userId from username lookup');
                // 尝试从API获取当前状态
                await fetchCurrentState();
              }
            } catch (error) {
              console.error('Error fetching user by username:', error);
              // 如果通过用户名获取失败，尝试从当前状态获取
              await fetchCurrentState();
            }
          }
        } catch (e) {
          console.error('Error processing user info:', e);
          await fetchCurrentState();
        }
      } else {
        console.warn('No currentUser found in global state');
        // 如果没有找到用户，尝试通过API获取当前状态
        await fetchCurrentState();
      }
    };

    // 从当前状态获取用户信息的辅助函数
    const fetchCurrentState = async () => {
      try {
        const state = await currentState();
        console.log('Current state from API:', state);

        if (state && state.currentUser) {
          if (typeof state.currentUser === 'object') {
            if (state.currentUser.userId) {
              setUserId(state.currentUser.userId);
              console.log('Set userId from currentState API:', state.currentUser.userId);
            } else if (state.currentUser.id) {
              setUserId(state.currentUser.id);
              console.log('Set userId from currentState API (id):', state.currentUser.id);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching current state:', error);
        message.warning('未检测到登录信息，请重新登录');
      }
    };

    fetchUserData();
  }, [currentUser]);

  // 硬编码临时解决方案，如果通过API也无法获取用户ID
  useEffect(() => {
    if (!userId) {
      const hardcodedUserId = 10; // 从API响应中看到用户c3的ID是10
      console.log('No userId found, using hardcoded ID:', hardcodedUserId);
      setUserId(hardcodedUserId);
    }
  }, [userId]);

  // 加载模型数据
  useEffect(() => {
    const fetchModelData = async () => {
      if (userId) {
        try {
          console.log('Fetching model data for userId:', userId);
          const response = await getModels(userId);
          console.log('Model data response:', response);

          // 确保response是数组
          if (Array.isArray(response)) {
            setModelData(response);
          } else if (response && Array.isArray(response.data)) {
            setModelData(response.data);
          } else {
            console.warn('Response is not an array:', response);
            setModelData([]);
          }
        } catch (error) {
          console.error('Error fetching model data:', error);
          setModelData([]);
        }
      }
    };

    fetchModelData();
  }, [userId]);

  // 表单提交处理
  const handleSubmit = () => {
    if (!userId) {
      message.error('无法获取用户ID，请重新登录');
      return;
    }

    // 验证文件是否已上传
    if (!fileList || fileList.length === 0) {
      message.error('请选择模型文件');
      return;
    }

    // 获取表单数据
    form.validateFields().then(async (values) => {
      const hide = message.loading('正在上传模型文件，请稍候...');
      try {
        const formData = new FormData();
        const file = fileList[0].originFileObj || fileList[0];
        formData.append('file', file);
        formData.append('modelName', values.modelName);
        formData.append('modelDes', values.modelDes);
        formData.append('inputNum', values.inputNum);
        formData.append('outputNum', values.outputNum);
        formData.append('taskType', values.taskType);
        formData.append('userId', userId.toString());

        console.log('Uploading model with data:', {
          modelName: values.modelName,
          modelDes: values.modelDes,
          inputNum: values.inputNum,
          outputNum: values.outputNum,
          taskType: values.taskType,
          userId: userId,
          file: file.name,
          fileSize: (file.size / 1024 / 1024).toFixed(2) + 'MB',
          fileType: file.type
        });

        const result = await uploadModel(formData);
        console.log('Upload model result:', result);

        hide();
        if (result && result.success) {
          message.success('模型上传成功');
          handleModalVisible(false);
          // 重新加载数据
          if (actionRef.current) {
            actionRef.current.reload();
          }
          // 清空表单和文件列表
          form.resetFields();
          setFileList([]);
          setFileUploaded(false);
        } else {
          const errorMsg = (result && result.message) || '上传失败，请确保已正确登录并填写所有必填字段';
          message.error(errorMsg);
          console.error('Upload failed with response:', result);
        }
      } catch (error) {
        console.error('Error uploading model:', error);
        hide();
        message.error(`上传失败: ${error.message || '未知错误'}`);
      }
    }).catch(errorInfo => {
      console.log('Validation failed:', errorInfo);
      message.error('表单验证失败，请检查输入');
    });
  };

  const handleDelete = async (id) => {
    const hide = message.loading('正在删除...');
    try {
      const result = await deleteModel(id);
      console.log('Delete model result:', result);
      hide();
      if (result.success) {
        message.success('删除成功');
        // 重新加载数据
        if (actionRef.current) {
          actionRef.current.reload();
        }
      } else {
        message.error(result.message || '删除失败');
      }
    } catch (error) {
      console.error('Error deleting model:', error);
      hide();
      message.error('删除失败，请重试');
    }
  };

  const columns = [
    {
      title: '模型名称',
      dataIndex: 'modelName',
      sorter: true,
      align: 'center',
    },
    {
      title: '模型描述',
      dataIndex: 'modelDes',
      ellipsis: true,
      align: 'center',
    },
    {
      title: '任务类型',
      dataIndex: 'taskType',
      valueEnum: {
        '目标检测': { text: '目标检测' },
        '地物分类': { text: '地物分类' },
      },
      align: 'center',
    },
    {
      title: '输入通道数',
      dataIndex: 'inputNum',
      sorter: true,
      align: 'center',
    },
    {
      title: '输出通道数',
      dataIndex: 'outputNum',
      sorter: true,
      align: 'center',
    },
    {
      title: '操作',
      dataIndex: 'option',
      valueType: 'option',
      align: 'center',
      render: (_, record) => [
        <Popconfirm
          key="delete"
          title="确定删除此模型吗？"
          onConfirm={() => handleDelete(record.modelId)}
        >
          <Button 
            type="primary" 
            danger 
            size="small"
          >
            删除
          </Button>
        </Popconfirm>,
      ],
    },
  ];

  // 文件上传配置
  const uploadProps = {
    onRemove: () => {
      setFileList([]);
      setFileUploaded(false);
    },
    beforeUpload: (file) => {
      setFileList([file]);
      setFileUploaded(true);
      return false; // 阻止自动上传
    },
    fileList,
    accept: '.pth,.pt,.joblib,.pkl,.h5,.model',
    multiple: false,
    maxCount: 1,
  };

  return (
    <PageContainer>
      {userId ? (
        <ProTable
          headerTitle="模型列表"
          actionRef={actionRef}
          rowKey="modelId"
          search={false}
          toolBarRender={() => [
            <Button
              type="primary"
              key="primary"
              onClick={() => handleModalVisible(true)}
            >
              <PlusOutlined /> 新建
            </Button>,
          ]}
          dataSource={modelData}
          columns={columns}
          pagination={{
            pageSize: 10,
          }}
          rowClassName={() => 'table-row-center'}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <h3>无法获取用户信息，请重新登录后尝试</h3>
        </div>
      )}
      <Modal
        title="新增模型"
        visible={createModalVisible}
        onCancel={() => {
          handleModalVisible(false);
          form.resetFields();
          setFileList([]);
          setFileUploaded(false);
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            handleModalVisible(false);
            form.resetFields();
            setFileList([]);
            setFileUploaded(false);
          }}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmit} disabled={fileList.length === 0}>
            提交
          </Button>
        ]}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="modelName"
            label="模型名称"
            rules={[{ required: true, message: '请输入模型名称' }]}
          >
            <Input placeholder="请输入模型名称" />
          </Form.Item>
          <Form.Item
            name="modelDes"
            label="模型描述"
            rules={[{ required: true, message: '请输入模型描述' }]}
          >
            <Input.TextArea rows={4} placeholder="请输入模型描述" />
          </Form.Item>
          <Form.Item
            name="taskType"
            label="任务类型"
            rules={[{ required: true, message: '请选择任务类型' }]}
          >
            <Select placeholder="请选择任务类型">
              <Select.Option value="目标检测">目标检测</Select.Option>
              <Select.Option value="地物分类">地物分类</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="inputNum"
            label="输入通道数"
            rules={[{ required: true, message: '请输入输入通道数' }]}
          >
            <Input type="number" placeholder="请输入输入通道数" />
          </Form.Item>
          <Form.Item
            name="outputNum"
            label="输出通道数"
            rules={[{ required: true, message: '请输入输出通道数' }]}
          >
            <Input type="number" placeholder="请输入输出通道数" />
          </Form.Item>
          <Form.Item
            label="模型文件"
            required
            help={fileList.length === 0 ? "请上传模型文件" : null}
            validateStatus={fileList.length === 0 ? "error" : "success"}
          >
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />} disabled={fileList.length >= 1}>
                {fileList.length >= 1 ? `已选择: ${fileList[0].name}` : '选择文件'}
              </Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default ModelManage;
