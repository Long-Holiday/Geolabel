import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input, message, Select, Badge } from 'antd';
import { UpOutlined, DownOutlined, MessageOutlined, ClearOutlined } from '@ant-design/icons';
import { reqGetModelList, reqAssistFunction, reqInferenceFunction } from '@/services/map/api.js';
import { reqBatchTrainTasks, reqBatchInferenceTasks } from '@/services/taskManage/api.js';
import { useModel } from 'umi';
import { currentState as getCurrentState } from '@/services/login/api';
import './ModelToolPanel.less';

const { TextArea } = Input;
const { Option } = Select;

const ModelToolPanel = ({ selectedTasks, onBatchTrainComplete, onBatchInferenceComplete }) => {
  const [expanded, setExpanded] = useState(false);

  // 模型工具状态
  const [assistInput, setAssistInput] = useState('');
  const [modelName, setModelName] = useState('');
  const [assistFunction, setAssistFunction] = useState('');
  const [param1, setParam1] = useState('');
  const [param2, setParam2] = useState('');
  const [param3, setParam3] = useState('');
  const [param4, setParam4] = useState('');
  const [categoryMapping, setCategoryMapping] = useState(JSON.stringify({"0": "类别一ID", "1": "类别二ID"}, null, 2));
  const [modelResults, setModelResults] = useState({});
  const [modelList, setModelList] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');

  // 用户状态管理
  const [currentUserInfo, setCurrentUserInfo] = useState(null);
  const [isUserInfoLoaded, setIsUserInfoLoaded] = useState(false);

  // WebSocket状态
  const [websocket, setWebsocket] = useState(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);

  // 消息窗口状态
  const [messageWindowVisible, setMessageWindowVisible] = useState(false);
  const [messages, setMessages] = useState([]);
  const [maxMessages] = useState(50); // 最大消息数量

  // 获取当前用户信息
  const {
    initialState,
  } = useModel('@@initialState');

  // 验证和格式化JSON字符串
  const validateAndFormatJSON = useCallback((jsonString) => {
    try {
      // 尝试解析JSON
      const parsed = JSON.parse(jsonString);
      // 重新格式化为标准JSON字符串
      return JSON.stringify(parsed);
    } catch (error) {
      console.warn('JSON格式无效，使用默认值:', error);
      // 返回默认的类别映射
             return JSON.stringify({"0": "类别一ID", "1": "类别二ID"});
    }
  }, []);

  // 获取用户信息的统一方法
  const fetchUserInfo = useCallback(async () => {
    try {
      // 首先尝试从全局状态获取
      const globalCurrentUser = initialState?.currentState?.currentUser;

      if (globalCurrentUser && typeof globalCurrentUser === 'string') {
        // 如果全局状态中有用户名，直接使用
        setCurrentUserInfo({ username: globalCurrentUser });
        setIsUserInfoLoaded(true);
        return { username: globalCurrentUser };
      }

      // 如果全局状态不可用，从API获取当前状态
      const currentStateResponse = await getCurrentState();
      if (currentStateResponse && currentStateResponse.currentUser) {
        const userInfo = { username: currentStateResponse.currentUser };
        setCurrentUserInfo(userInfo);
        setIsUserInfoLoaded(true);
        return userInfo;
      }

      throw new Error('无法获取用户信息');
    } catch (error) {
      console.error('获取用户信息失败:', error);
      setIsUserInfoLoaded(true);
      return null;
    }
  }, [initialState]);

  // 初始化用户信息
  useEffect(() => {
    if (!isUserInfoLoaded) {
      fetchUserInfo();
    }
  }, [fetchUserInfo, isUserInfoLoaded]);

  // 组件初始化时添加欢迎消息
  useEffect(() => {
    addMessage('系统', '🎉 AI辅助工具已加载，准备就绪', 'info');
  }, [addMessage]);

  // 获取用户ID
  const getUserId = useCallback(() => {
    if (!currentUserInfo || selectedTasks.length === 0) {
      return null;
    }

    const firstTask = selectedTasks[0];
    const user = firstTask.userArr?.find(({ username }) => username === currentUserInfo.username);
    return user?.userid;
  }, [currentUserInfo, selectedTasks]);

  // 获取任务类型（假设批量操作的任务类型相同）
  const getTaskType = useCallback(() => {
    if (selectedTasks.length > 0) {
      return selectedTasks[0].type;
    }
    return null;
  }, [selectedTasks]);

  const isObjectDetection = getTaskType() === '目标检测';

  // 添加消息到消息窗口
  const addMessage = useCallback((type, content, level = 'info') => {
    const newMessage = {
      id: Date.now() + Math.random(),
      type,
      content,
      level, // 'info', 'success', 'warning', 'error'
      timestamp: new Date().toLocaleString()
    };

    setMessages(prevMessages => {
      const updatedMessages = [newMessage, ...prevMessages];
      // 限制消息数量
      return updatedMessages.slice(0, maxMessages);
    });
  }, [maxMessages]);

  // 清空消息
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // 切换消息窗口显示状态
  const toggleMessageWindow = useCallback(() => {
    setMessageWindowVisible(prev => !prev);
  }, []);

  // WebSocket连接管理
  useEffect(() => {
    if (!isUserInfoLoaded || !currentUserInfo) {
      return;
    }

    const userId = getUserId();
    if (!userId) {
      return;
    }

    let ws = null;
    let reconnectTimer = null;

    // 建立WebSocket连接
    const connectWebSocket = () => {
      try {
        // 如果已有连接，先关闭
        if (ws && ws.readyState !== WebSocket.CLOSED) {
          ws.close();
        }

        // 首先尝试直接WebSocket连接
        const wsUrl = `ws://localhost:1290/ws/task-notifications?userId=${userId}`;
        console.log('尝试连接WebSocket:', wsUrl);
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('WebSocket连接已建立');
          setIsWebSocketConnected(true);
          setWebsocket(ws);
          addMessage('系统', '🔗 WebSocket连接已建立，可以接收实时通知', 'success');

          // 清除重连定时器
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
          }
        };

        ws.onmessage = (event) => {
          try {
            const notification = JSON.parse(event.data);
            console.log('收到WebSocket消息:', notification);

            // 处理不同类型的通知
            switch (notification.type) {
              case 'BATCH_TRAIN_COMPLETE':
                if (notification.success) {
                  message.success(`批量训练完成: ${notification.message}`);
                  addMessage('批量训练', `✅ ${notification.message}`, 'success');
                } else {
                  message.error(`批量训练失败: ${notification.message}`);
                  addMessage('批量训练', `❌ ${notification.message}`, 'error');
                }
                if (onBatchTrainComplete) {
                  onBatchTrainComplete(notification);
                }
                break;

              case 'BATCH_INFERENCE_COMPLETE':
                if (notification.success) {
                  message.success(`批量推理完成: ${notification.message}`);
                  addMessage('批量推理', `✅ ${notification.message}`, 'success');
                } else {
                  message.error(`批量推理失败: ${notification.message}`);
                  addMessage('批量推理', `❌ ${notification.message}`, 'error');
                }
                if (onBatchInferenceComplete) {
                  onBatchInferenceComplete(notification);
                }
                break;

              case 'TRAIN_COMPLETE':
                if (notification.success) {
                  message.success(`训练完成: ${notification.message}`);
                  addMessage('训练', `✅ ${notification.message}`, 'success');
                } else {
                  message.error(`训练失败: ${notification.message}`);
                  addMessage('训练', `❌ ${notification.message}`, 'error');
                }
                break;

              case 'INFERENCE_COMPLETE':
                if (notification.success) {
                  message.success(`推理完成: ${notification.message}`);
                  addMessage('推理', `✅ ${notification.message}`, 'success');
                } else {
                  message.error(`推理失败: ${notification.message}`);
                  addMessage('推理', `❌ ${notification.message}`, 'error');
                }
                break;

              case 'TASK_PROGRESS':
                message.info(`任务进度: ${notification.progress}% - ${notification.message}`);
                addMessage('进度', `🔄 ${notification.progress}% - ${notification.message}`, 'info');
                break;

              default:
                console.log('未知通知类型:', notification.type);
            }
          } catch (error) {
            console.error('解析WebSocket消息失败:', error);
          }
        };

        ws.onclose = (event) => {
          console.log('WebSocket连接已关闭, 代码:', event.code, '原因:', event.reason);
          setIsWebSocketConnected(false);
          setWebsocket(null);
          addMessage('系统', '🔌 WebSocket连接已断开', 'warning');

          // 只有在非正常关闭时才重连
          if (event.code !== 1000 && currentUserInfo && getUserId()) {
            console.log('尝试重新连接WebSocket...');
            addMessage('系统', '🔄 正在尝试重新连接...', 'info');
            reconnectTimer = setTimeout(() => {
              connectWebSocket();
            }, 5000);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket连接错误:', error);
          setIsWebSocketConnected(false);
        };

      } catch (error) {
        console.error('创建WebSocket连接失败:', error);
        setIsWebSocketConnected(false);
      }
    };

    connectWebSocket();

    // 清理函数
    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.close(1000, 'Component unmounting');
      }
      setWebsocket(null);
      setIsWebSocketConnected(false);
    };
  }, [isUserInfoLoaded, currentUserInfo, getUserId, onBatchTrainComplete, onBatchInferenceComplete]);

  // 获取模型列表
  useEffect(() => {
    const fetchModelList = async () => {
      if (!isUserInfoLoaded || !currentUserInfo) {
        console.warn('用户信息未加载，跳过获取模型列表');
        return;
      }

      const userId = getUserId();
      if (!userId) {
        console.warn('用户ID未定义，无法获取模型列表');
        return;
      }

      const taskType = getTaskType();
      if (!taskType) {
        console.warn('任务类型未定义，无法获取模型列表');
        return;
      }

      try {
        const response = await reqGetModelList({
          user_id: userId,
          task_type: taskType
        });

        console.log('获取模型列表响应:', response);

        if (response.code === 200) {
          if (typeof response.data === 'object' && !Array.isArray(response.data)) {
            // 如果返回的是对象（键值对），直接使用
            setModelResults(response.data);
            setModelList(Object.keys(response.data));
            console.log('设置模型结果:', response.data);
            console.log('设置模型列表:', Object.keys(response.data));
          } else if (Array.isArray(response.data)) {
            // 如果返回的是数组，转换为对象
            setModelList(response.data);
            const dict = response.data.reduce((acc, model) => {
              acc[model] = '';
              return acc;
            }, {});
            setModelResults(dict);
            console.log('设置模型结果(数组转对象):', dict);
            console.log('设置模型列表(数组):', response.data);
          } else {
            // 其他情况，设置为空
            setModelResults({});
            setModelList([]);
            console.warn('模型数据格式不正确:', response.data);
          }
        } else {
          message.error('获取模型列表失败: ' + (response.message || '未知错误'));
          setModelResults({});
          setModelList([]);
        }
      } catch (error) {
        console.error('获取模型列表异常:', error);
        message.error('获取模型列表失败：' + error.message);
        setModelResults({});
        setModelList([]);
      }
    };

    if (selectedTasks.length > 0 && isUserInfoLoaded) {
      fetchModelList();
    } else {
      // 如果没有选中任务，清空模型列表
      setModelResults({});
      setModelList([]);
      setSelectedModel('');
    }
  }, [selectedTasks, isUserInfoLoaded, currentUserInfo, getUserId, getTaskType]);

  // 批量训练（调用辅助）
  const handleBatchAssistClick = async () => {
    if (selectedTasks.length === 0) {
      message.error('请先选择要训练的任务！');
      return;
    }

    if (!assistFunction || assistFunction === 'none') {
      message.error('请先选择一个模型！');
      return;
    }

    // 确保用户信息已加载
    if (!isUserInfoLoaded || !currentUserInfo) {
      message.error('用户信息未加载，请稍后重试');
      return;
    }

    const userId = getUserId();
    if (!userId) {
      message.error('无法获取用户 ID，请检查用户信息');
      return;
    }

    const taskType = getTaskType();

    // 验证和格式化categoryMapping
    const validatedCategoryMapping = validateAndFormatJSON(categoryMapping);

    let parameters = {};
    if (taskType === '目标检测') {
      parameters = {
        param1: param1 || '',
        param2: param2 || '',
        param3: param3 || '1',
        param4: param4 || '',
        categoryMapping: validatedCategoryMapping,
      };
    } else {
      parameters = {
        param1: param1 || '',
        param2: param2 || '',
        param3: param3 || '',
        param4: param4 || '',
        categoryMapping: validatedCategoryMapping,
      };
    }

    try {
      const hide = message.loading('正在提交批量训练任务...');

      // 构造批量训练请求
      const taskIds = selectedTasks.map(task => task.taskid.toString());

      console.log('批量训练请求参数:', {
        taskids: taskIds,
        task_type: taskType,
        user_id: userId,
        functionName: assistFunction,
        assistInput: assistInput || '150',
        modelName: modelName || '',
        parameters,
      });

      // 调用批量训练API
      const result = await reqBatchTrainTasks({
        taskids: taskIds,
        task_type: taskType,
        user_id: userId,
        functionName: assistFunction,
        assistInput: assistInput || '150',
        modelName: modelName || '',
        parameters,
      });

      hide();
      if (result.code === 200) {
        message.success(`${selectedTasks.length}个训练任务已提交`);
        addMessage('批量训练', `🚀 已提交${selectedTasks.length}个训练任务，正在后台处理中...`, 'info');
        if (onBatchTrainComplete) {
          onBatchTrainComplete(result);
        }
      } else {
        message.error(result.message || '批量训练任务提交失败');
        addMessage('批量训练', `❌ 任务提交失败: ${result.message || '未知错误'}`, 'error');
      }
    } catch (error) {
      message.error('批量训练任务提交失败：' + error.message);
      addMessage('批量训练', `❌ 任务提交异常: ${error.message}`, 'error');
    }
  };

  // 批量推理
  const handleBatchInferenceClick = async () => {
    if (selectedTasks.length === 0) {
      message.error('请先选择要推理的任务！');
      return;
    }

    if (!selectedModel) {
      message.error('请先选择一个推理模型！');
      return;
    }

    // 确保用户信息已加载
    if (!isUserInfoLoaded || !currentUserInfo) {
      message.error('用户信息未加载，请稍后重试');
      return;
    }

    const userId = getUserId();
    if (!userId) {
      message.error('无法获取用户 ID，请检查用户信息');
      return;
    }

    const taskType = getTaskType();

    // 验证和格式化categoryMapping
    const validatedCategoryMapping = validateAndFormatJSON(categoryMapping);

    let parameters = {};
    if (taskType === '目标检测') {
      parameters = {
        param1: param1 || '',
        param2: param2 || '',
        param3: param3 || '1',
        param4: param4 || '',
        categoryMapping: validatedCategoryMapping,
      };
    } else {
      parameters = {
        param1: param1 || '',
        param2: param2 || '',
        param3: param3 || '',
        param4: param4 || '',
        categoryMapping: validatedCategoryMapping,
      };
    }

    try {
      const hide = message.loading('正在提交批量推理任务...');

      // 构造批量推理请求
      const taskIds = selectedTasks.map(task => task.taskid.toString());

      console.log('批量推理请求参数:', {
        taskids: taskIds,
        user_id: userId,
        model: selectedModel,
        parameters,
      });

      // 调用批量推理API
      const result = await reqBatchInferenceTasks({
        taskids: taskIds,
        user_id: userId,
        model: selectedModel,
        parameters,
      });

      hide();
      if (result.code === 200) {
        message.success(`${selectedTasks.length}个推理任务已提交`);
        addMessage('批量推理', `🚀 已提交${selectedTasks.length}个推理任务，正在后台处理中...`, 'info');
        if (onBatchInferenceComplete) {
          onBatchInferenceComplete(result);
        }
      } else {
        message.error(result.message || '批量推理任务提交失败');
        addMessage('批量推理', `❌ 任务提交失败: ${result.message || '未知错误'}`, 'error');
      }
    } catch (error) {
      message.error('批量推理任务提交失败：' + error.message);
      addMessage('批量推理', `❌ 任务提交异常: ${error.message}`, 'error');
    }
  };

  // 处理categoryMapping输入变化
  const handleCategoryMappingChange = useCallback((e) => {
    const value = e.target.value;
    setCategoryMapping(value);
  }, []);

  // 格式化categoryMapping
  const formatCategoryMapping = useCallback(() => {
    try {
      const parsed = JSON.parse(categoryMapping);
      const formatted = JSON.stringify(parsed, null, 2);
      setCategoryMapping(formatted);
      message.success('JSON格式化成功');
    } catch (error) {
      message.error('JSON格式无效，请检查语法');
    }
  }, [categoryMapping]);

  // 定义模型选项
  const objectDetectionModels = [
    { value: 'yolo', label: 'YOLO' },
  ];
  const classificationModels = [
    { value: 'unet', label: 'UNet' },
    { value: 'fast_scnn', label: 'Fast SCNN' },
    {value: 'deeplab', label: 'DeepLabV3+' },
  ];

  return (
    <div className="model-tool-panel expanded">
      <div className="model-tool-header">
        <span>AI辅助工具</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isUserInfoLoaded && currentUserInfo && (
            <span style={{
              fontSize: '12px',
              color: isWebSocketConnected ? '#52c41a' : '#ff4d4f',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isWebSocketConnected ? '#52c41a' : '#ff4d4f',
                display: 'inline-block'
              }}></span>
              {isWebSocketConnected ? '实时通知已连接' : '实时通知未连接'}
            </span>
          )}
          <Badge count={messages.length} size="small" overflowCount={99}>
            <Button
              type="text"
              size="small"
              icon={<MessageOutlined />}
              onClick={toggleMessageWindow}
              title="查看消息记录"
            />
          </Badge>
        </div>
      </div>

      <div className="model-tool-content">

        {/* 消息窗口 */}
        {messageWindowVisible && (
          <div className="message-window" style={{
            marginBottom: 16,
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            backgroundColor: '#fafafa'
          }}>
            <div style={{
              padding: '8px 12px',
              borderBottom: '1px solid #d9d9d9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f5f5f5'
            }}>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>任务消息记录</span>
              <div>
                <Button
                  type="text"
                  size="small"
                  icon={<ClearOutlined />}
                  onClick={clearMessages}
                  title="清空消息"
                  style={{ marginRight: 4 }}
                />
                <Button
                  type="text"
                  size="small"
                  onClick={toggleMessageWindow}
                  title="关闭窗口"
                >
                  ×
                </Button>
              </div>
            </div>
            <div className="message-list" style={{
              maxHeight: '200px',
              overflowY: 'auto',
              padding: '8px'
            }}>
              {messages.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  color: '#999',
                  padding: '20px',
                  fontSize: '12px'
                }}>
                  暂无消息记录
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className="message-item"
                    style={{
                      marginBottom: '8px',
                      padding: '6px 8px',
                      backgroundColor: '#fff',
                      borderRadius: '4px',
                      border: '1px solid #e8e8e8',
                      fontSize: '12px'
                    }}
                  >
                    <div className="message-header" style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '2px'
                    }}>
                      <span className={`message-type ${msg.level}`} style={{
                        fontWeight: '500'
                      }}>
                        [{msg.type}]
                      </span>
                      <span style={{ color: '#999', fontSize: '11px' }}>
                        {msg.timestamp}
                      </span>
                    </div>
                    <div className="message-content" style={{ color: '#333', lineHeight: '1.4' }}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="assist-function-section">
          <div className="assist-function-select">
            <div style={{ marginBottom: 8 }}>
              <span>模型选择：</span>
              <Select
                style={{ width: 200, marginLeft: 8 }}
                value={assistFunction}
                onChange={(value) => setAssistFunction(value)}
                placeholder="请选择模型"
              >
                {isObjectDetection
                  ? objectDetectionModels.map((model) => (
                    <Option value={model.value} key={model.value}>
                      {model.label}
                    </Option>
                  ))
                  : classificationModels.map((model) => (
                    <Option value={model.value} key={model.value}>
                      {model.label}
                    </Option>
                  ))}
              </Select>
            </div>

            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: '12px', color: '#666' }}>训练次数：</span>
                  <Input
                    value={assistInput}
                    onChange={(e) => setAssistInput(e.target.value)}
                    style={{ width: 120 }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: '12px', color: '#666' }}>模型名称：</span>
                  <Input
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    style={{ width: 120 }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: '140px' }}>
                  <span style={{ fontSize: '12px', color: 'transparent' }}>操作：</span>
                  <Button
                    type="primary"
                    onClick={handleBatchAssistClick}
                    disabled={selectedTasks.length === 0}
                    style={{ width: '100%' }}
                  >
                    批量训练 ({selectedTasks.length})
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="inference-section">
            <div style={{ marginBottom: 8 }}>
              <span>推理模型：</span>
              <Select
                style={{ width: 200, marginLeft: 8 }}
                value={selectedModel}
                onChange={(value) => {
                  setSelectedModel(value);
                  setModelResults(prev => ({
                    ...prev,
                    selectedValue: prev[value] || ''
                  }));
                }}
                placeholder="请选择推理模型"
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {modelList.map((modelKey) => (
                  <Option value={modelKey} key={modelKey}>
                    {modelKey}
                  </Option>
                ))}
              </Select>
              <Button
                type="primary"
                onClick={handleBatchInferenceClick}
                style={{ marginLeft: 8 }}
                disabled={selectedTasks.length === 0}
              >
                批量推理 ({selectedTasks.length})
              </Button>
            </div>
            {selectedTasks.length > 0 && (
              <div style={{ fontSize: '12px', color: '#666', marginBottom: 8 }}>
                已选择 {selectedTasks.length} 个任务: {selectedTasks.map(task => task.taskname).join(', ')}
              </div>
            )}
            {modelList.length > 0 && (
              <div style={{ fontSize: '12px', color: '#666', marginBottom: 8 }}>
                可用模型数量: {modelList.length}
              </div>
            )}
          </div>

          {selectedModel && (
            <div className="assist-params">
              {!isObjectDetection && (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: '13px', fontWeight: '500', color: '#333' }}>模型参数设置：</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: '12px', color: '#666' }}>最小物体大小：</span>
                        <Input
                          value={param1}
                          onChange={(e) => setParam1(e.target.value)}
                          style={{ width: 110 }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: '12px', color: '#666' }}>最大孔洞大小：</span>
                        <Input
                          value={param2}
                          onChange={(e) => setParam2(e.target.value)}
                          style={{ width: 110 }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: '12px', color: '#666' }}>边界平滑程度：</span>
                        <Input
                          value={param3}
                          onChange={(e) => setParam3(e.target.value)}
                          style={{ width: 110 }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
              {isObjectDetection && (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: '13px', fontWeight: '500', color: '#333' }}>模型参数设置：</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: '12px', color: '#666' }}>置信度阈值：</span>
                        <Input
                          value={param1}
                          onChange={(e) => setParam1(e.target.value)}
                          style={{ width: 110 }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: '12px', color: '#666' }}>输入图像尺寸：</span>
                        <Input
                          value={param2}
                          onChange={(e) => setParam2(e.target.value)}
                          style={{ width: 110 }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: '#333' }}>类别映射配置：</span>
                  <Button
                    size="small"
                    onClick={formatCategoryMapping}
                    type="dashed"
                  >
                    格式化JSON
                  </Button>
                </div>
                <TextArea
                  value={categoryMapping}
                  onChange={handleCategoryMappingChange}
                  autoSize={{ minRows: 3, maxRows: 6 }}
                  style={{ width: '100%' }}
                />
                <div style={{ fontSize: '12px', color: '#999', marginTop: 6, lineHeight: '1.4' }}>
                  <div>格式示例：{"{"}"0": "类别一ID", "1": "类别二ID"{"}"}</div>
                  <div>提示：键为数字字符串，值为对应的类别ID</div>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: '#333' }}>模型信息：</span>
                </div>
                <TextArea
                  value={modelResults.selectedValue || JSON.stringify(modelResults, null, 2)}
                  readOnly
                  autoSize={{ minRows: 3, maxRows: 6 }}
                  style={{
                    width: '100%',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #e9ecef',
                    color: '#495057'
                  }}
                />
              </div>

            </div>

          )}

        </div>
      </div>
    </div>
  );
};

export default ModelToolPanel;
