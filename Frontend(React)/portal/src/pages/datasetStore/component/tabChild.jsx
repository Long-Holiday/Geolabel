import { Button, Card, Col, Popconfirm, Row, Tag, message, Checkbox, Input, Modal, Form, InputNumber, Image } from 'antd';
import '../style.less';
import { useCallback, useEffect, useState } from 'react';
import {
  reqDelDataset,
  reqDownload,
  reqDownloadMultiple,
  reqGetDataset,
  reqGetDatasetImg,
  reqPublishSharedDataset,
} from '@/services/dataset/api';
import { DeleteOutlined, DownloadOutlined, SearchOutlined, ShareAltOutlined, EyeOutlined } from '@ant-design/icons';
import { getUserByUsername } from '@/services/login/api';

export default function tabChild({
  currentState = {}, // 提供默认值
}) {
  // 正确获取currentUser
  const currentUser = currentState?.currentUser || {};
  
  // 如果currentUser是字符串，那么它就是用户名
  const isCurrentUserString = typeof currentUser === 'string';
  
  // 用户ID和用户名状态
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState('');
  
  // 打印完整的currentState以便调试
  console.log('完整的currentState:', currentState);
  console.log('currentUser:', currentUser);
  console.log('currentUser类型:', typeof currentUser);
  
  // 当前样本状态
  const [
    {
      sampleid,
      taskid,
    },
    setCurrentSample,
  ] = useState({
    sampleid: null,
  });
  const [sampleArr, setSampleArr] = useState([]);
  // Add state for selected samples
  const [selectedSamples, setSelectedSamples] = useState([]);
  // 添加样本名称搜索状态
  const [searchSampleName, setSearchSampleName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  // 添加发布共享数据集弹窗状态
  const [publishModalVisible, setPublishModalVisible] = useState(false);
  const [publishForm] = Form.useForm();
  const [isPublishing, setIsPublishing] = useState(false);

  // 获取用户信息
  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        try {
          // 如果currentUser是对象
          if (typeof currentUser === 'object') {
            if (currentUser.userid) {
              setUserId(currentUser.userid);
              setUsername(currentUser.username || '');
              console.log('设置userId从对象:', currentUser.userid);
            } else if (currentUser.user_id) {
              setUserId(currentUser.user_id);
              setUsername(currentUser.username || '');
              console.log('设置userId从对象(user_id):', currentUser.user_id);
            } else if (currentUser.id) {
              setUserId(currentUser.id);
              setUsername(currentUser.username || '');
              console.log('设置userId从对象(id):', currentUser.id);
            } else {
              console.warn('用户已登录但未找到userId');
              console.log('完整currentUser对象:', currentUser);
            }
          }
          // 如果currentUser是字符串 (例如 "c3")，它是用户名而不是用户ID
          else if (typeof currentUser === 'string') {
            console.log('currentUser是字符串(用户名):', currentUser);
            setUsername(currentUser);

            try {
              // 通过用户名查询用户信息
              const response = await getUserByUsername(currentUser);
              console.log('通过用户名查询用户信息结果:', response);

              if (response && response.userId) {
                setUserId(response.userId);
                console.log('通过用户名查询设置userId:', response.userId);
              } else if (response && response.id) {
                setUserId(response.id);
                console.log('通过用户名查询设置userId(id):', response.id);
              } else if (response && response.userid) {
                setUserId(response.userid);
                console.log('通过用户名查询设置userId(userid):', response.userid);
              } else {
                console.warn('无法从用户名查询中找到userId');
              }
            } catch (error) {
              console.error('通过用户名获取用户信息出错:', error);
            }
          }
        } catch (e) {
          console.error('处理用户信息时出错:', e);
        }
      } else {
        console.warn('全局状态中未找到currentUser');
      }
    };

    fetchUserData();
  }, [currentUser]);

  // 加载样本数据的函数
  const loadDatasets = async (sampleNameParam = '') => {
    try {
      // 使用从props中提取的userId
      console.log('当前用户:', username, '用户ID:', userId);
      console.log('搜索样本名称:', sampleNameParam);
      
      setIsSearching(true); // 设置搜索状态为true
      
      // 构建请求参数对象
      const requestParams = {};
      
      // 只有当有用户ID时才添加userId参数
      if (userId) {
        requestParams.userId = userId;
      }
      
      // 只有当有用户名时才添加username参数
      if (username) {
        requestParams.username = username;
      }
      
      // 只有当有搜索关键词时才添加sampleName参数
      if (sampleNameParam) {
        requestParams.sampleName = sampleNameParam;
      }
      
      console.log('发送请求参数:', requestParams);
      
      const result = await reqGetDataset(requestParams);
      
      if (result.code == 200) {
        setSampleArr(result.data.taskDatasetInfos || []);
        console.log('搜索结果数量:', result.data.taskDatasetInfos?.length || 0);
        console.log('Sample array data structure:', JSON.stringify(result.data.taskDatasetInfos, null, 2));
        console.log('Sample array data:', result.data.taskDatasetInfos);
        if (result.data.taskDatasetInfos?.length > 0) {
          console.log('First sample item:', result.data.taskDatasetInfos[0]);
          console.log('First sample item keys:', Object.keys(result.data.taskDatasetInfos[0]));
        }
      } else {
        console.error('API返回错误:', result);
        message.error(`获取样本失败: ${result.message || '未知错误'}`);
      }
    } catch (error) {
      message.error('样本获取失败，请联系管理员');
      console.error('API错误:', error);
    } finally {
      setIsSearching(false); // 设置搜索状态为false
    }
  };

  useEffect(() => {
    console.log('获取样本信息');
    // 获取样本信息，重置搜索内容
    setSearchSampleName('');
    if (userId || username) {
      loadDatasets();
    }
  }, [username, userId]);

  // 处理搜索按钮点击
  const handleSearch = () => {
    console.log('执行搜索，关键词:', searchSampleName);
    if (!searchSampleName || searchSampleName.trim() === '') {
      message.info('请输入搜索关键词');
      return;
    }
    loadDatasets(searchSampleName.trim());
  };

  // 处理输入框按下回车
  const handleInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 处理清除搜索
  const handleClearSearch = () => {
    setSearchSampleName('');
    loadDatasets('');
  };

  // Handle sample selection change
  const handleSelectSample = (sampleId, taskId, checked) => {
    console.log(`Selection change: sampleId=${sampleId}, taskId=${taskId}, checked=${checked}`);
    
    // Ensure we have a valid sample ID and task ID
    if (!taskId) {
      console.error('Cannot select sample: missing taskId');
      return;
    }
    
    // Use taskId as the fallback if sampleId is undefined
    const idToUse = sampleId || taskId;
    
    if (checked) {
      // Add this sample to the selection
      setSelectedSamples([...selectedSamples, { sampleId: idToUse, taskId }]);
    } else {
      // Remove this sample from the selection
      setSelectedSamples(selectedSamples.filter(item => 
        !(item.sampleId === idToUse || (item.sampleId === taskId && idToUse === taskId))
      ));
    }
  };

  // Select all samples
  const selectAllSamples = () => {
    if (sampleArr.length === 0) return;
    
    const allSamples = sampleArr.map((item) => {
      const taskid = item.task_id;
      // Try several possible property names for sample ID
      let sampleId = null;
      if (item.sample_id !== undefined) sampleId = item.sample_id;
      else if (item.sampleid !== undefined) sampleId = item.sampleid;
      else if (item.id !== undefined) sampleId = item.id;
      
      // If we still don't have a sampleId, use the taskid as a fallback
      const idToUse = sampleId || taskid;
      
      return { sampleId: idToUse, taskId: taskid };
    });
    
    setSelectedSamples(allSamples);
  };

  const confirm = useCallback(
    async (sampleid, taskid) => {
      try {
        const result = await reqDelDataset({ taskid, sampleid });
        if (result.code == 200) {
          message.success('删除成功！');
          setSampleArr(sampleArr.filter((item) => item.sampleid != sampleid));
          setCurrentSample({ sampleid: null });
          // Remove from selected samples if it was selected
          setSelectedSamples(selectedSamples.filter(item => item.sampleId !== sampleid));
        }
      } catch (error) {
        message.error('删除失败，请联系管理员！');
      }
    },
    [sampleArr, selectedSamples],
  );

  // Download selected sample
  const downloadSelected = async () => {
    if (selectedSamples.length === 0) {
      message.warning('请先选择要下载的样本');
      return;
    }
    
    const hide = message.loading('正在请求数据');
    
    try {
      // 提取所有选中样本的taskId
      const taskIds = selectedSamples.map(sample => sample.taskId);
      console.log('Downloading samples with taskIds:', taskIds);
      
      if (taskIds.length === 1) {
        // 如果只有一个样本，使用原有API通过Java后端下载
        const result = await reqDownload({taskid: taskIds[0]});
        
        if (typeof result.data === 'string') {
          const binaryData = atob(result.data); // 假设data是Base64字符串
          const len = binaryData.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryData.charCodeAt(i);
          }
          const blob = new Blob([bytes], {type: 'application/zip'})
          hide();
          let link = document.createElement('a');
          link.style.display = 'none';
          document.body.appendChild(link);
          link.target = '_blank';
          link.href = URL.createObjectURL(blob);
          link.download = 'RSCOCO.zip';
          link.click();
          URL.revokeObjectURL(link.href);
          document.body.removeChild(link);
          
          message.success('下载成功');
        }
      } else {
        // 如果有多个样本，使用新API通过Java后端下载
        const result = await reqDownloadMultiple({taskIds});
        
        if (typeof result.data === 'string') {
          const binaryData = atob(result.data); // Base64字符串解码
          const len = binaryData.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryData.charCodeAt(i);
          }
          const blob = new Blob([bytes], {type: 'application/zip'})
          hide();
          let link = document.createElement('a');
          link.style.display = 'none';
          document.body.appendChild(link);
          link.target = '_blank';
          link.href = URL.createObjectURL(blob);
          link.download = 'RSCOCO_merged.zip';
          link.click();
          URL.revokeObjectURL(link.href);
          document.body.removeChild(link);
          
          message.success(`已成功下载${taskIds.length}个样本合并的COCO数据集`);
        } else {
          hide();
          message.error(result.message || '下载请求失败');
        }
      }
    } catch (error) {
      hide();
      message.error('下载失败，请联系管理员');
      console.error('Download error:', error);
    }
  };

  // 打开发布共享数据集弹窗
  const showPublishModal = () => {
    if (selectedSamples.length === 0) {
      message.warning('请先选择要发布的样本');
      return;
    }
    
    publishForm.resetFields();
    setPublishModalVisible(true);
  };
  
  // 处理发布共享数据集
  const handlePublish = async () => {
    try {
      const values = await publishForm.validateFields();
      
      if (selectedSamples.length === 0) {
        message.warning('请先选择要发布的样本');
        return;
      }
      
      // 检查是否有用户ID
      if (!userId && !username) {
        message.error('未能获取用户信息，请重新登录');
        return;
      }
      
      setIsPublishing(true);
      
      // 提取所有选中样本的sampleId
      const sampleIds = selectedSamples.map(sample => sample.sampleId.toString());
      
      const requestData = {
        sampleIds,
        name: values.name,
        setDess: values.description,
        cont: values.contact,
        email: values.email,
        goal: values.goal
      };
      
      // 添加用户ID或用户名
      if (userId) {
        requestData.userId = userId;
      }
      
      if (username) {
        requestData.username = username;
      }
      
      console.log('发布共享数据集请求参数:', requestData);
      
      const result = await reqPublishSharedDataset(requestData);
      
      if (result.code === 200) {
        message.success('发布共享数据集成功');
        setPublishModalVisible(false);
        
        // 重新加载样本列表
        loadDatasets();
        
        // 清空选中的样本
        setSelectedSamples([]);
      } else {
        message.error(`发布失败: ${result.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('发布共享数据集错误:', error);
      message.error('发布失败，请检查表单填写是否正确');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="tab-content-wrapper" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Row style={{ flex: 1, height: '100%' }}>
        <Col span={24} style={{ height: '100%' }}>
        <Card
          className="card"
          title={
            searchSampleName && sampleArr.length > 0 
              ? `样本列表 - "${searchSampleName}"的搜索结果 (${sampleArr.length}个)` 
              : selectedSamples.length > 0 
                ? `样本列表 (已选${selectedSamples.length}个)` 
                : '样本列表'
          }
          headStyle={{ fontSize: 13 }}
          bodyStyle={{ padding: 10 }}
          extra={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Input
                placeholder="搜索任务名称"
                value={searchSampleName}
                onChange={(e) => setSearchSampleName(e.target.value)}
                onKeyPress={handleInputKeyPress}
                style={{ width: 200, marginRight: '8px' }}
                prefix={<SearchOutlined />}
                allowClear
                onPressEnter={handleSearch}
                disabled={isSearching}
              />
              <Button 
                type="primary" 
                onClick={handleSearch}
                loading={isSearching}
                disabled={!searchSampleName || searchSampleName.trim() === ''}
                style={{ marginRight: '8px' }}
              >
                搜索
              </Button>
              {searchSampleName && (
                <Button 
                  onClick={handleClearSearch}
                  style={{ marginRight: '8px' }}
                >
                  清除
                </Button>
              )}
              <Button 
                type="primary" 
                icon={<DownloadOutlined />} 
                onClick={downloadSelected}
                disabled={selectedSamples.length === 0}
                style={{ marginRight: '8px' }}
              >
                {selectedSamples.length > 1 ? '下载COCO数据集' : '下载样本'}
              </Button>
              <Button 
                type="primary" 
                icon={<ShareAltOutlined />} 
                onClick={showPublishModal}
                disabled={selectedSamples.length === 0}
                style={{ marginRight: '8px' }}
              >
                发布共享数据集
              </Button>
              {selectedSamples.length === 0 ? (
                <Button 
                  onClick={selectAllSamples}
                  style={{ marginRight: '8px' }}
                >
                  全选
                </Button>
              ) : (
                <Button 
                  onClick={() => setSelectedSamples([])}
                  style={{ marginRight: '8px' }}
                >
                  清除选择
                </Button>
              )}
            </div>
          }
        >
          <div style={{ height: 'calc(100% - 20px)', overflowY: 'auto' }}>
            {isSearching ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>正在搜索...</div>
            ) : sampleArr && sampleArr.length > 0 ? (
              <Row gutter={[16, 16]}>
                {sampleArr.map((item) => {
                  // Ensure we have the correct property names
                  const taskid = item.task_id;
                  const taskname = item.task_name || item.taskname;
                  const type = item.task_type || item.type;
                  const samplename = item.sample_name || item.samplename;
                  
                  // Try several possible property names for sample ID
                  let sampleId = null;
                  if (item.sample_id !== undefined) sampleId = item.sample_id;
                  else if (item.sampleid !== undefined) sampleId = item.sampleid;
                  else if (item.id !== undefined) sampleId = item.id;
                  
                  // If we still don't have a sampleId, use the taskid as a fallback
                  if (sampleId === null) {
                    console.warn(`Could not find sample ID for item, using taskid ${taskid} as fallback:`, item);
                    sampleId = taskid;
                  }
                  
                  // Log each item for debugging
                  console.log('Rendering sample item:', { taskid, taskname, type, sampleId, samplename });
                  
                  return (
                    <Col span={12} key={taskid}>
                      <div
                        className="sample"
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '12px',
                          cursor: 'pointer',
                          backgroundColor: selectedSamples.some(item => item.sampleId === sampleId) ? '#f0f7ff' : 'transparent',
                          border: '1px solid #f0f0f0',
                          borderRadius: '8px',
                          height: '100%',
                          minHeight: '120px'
                        }}
                        onClick={() => {
                          const isSelected = selectedSamples.some(item => item.sampleId === sampleId);
                          handleSelectSample(sampleId, taskid, !isSelected);
                        }}
                      >
                        <Checkbox 
                          checked={selectedSamples.some(item => item.sampleId === sampleId)}
                          style={{ marginRight: '12px' }}
                          onClick={(e) => {
                            // Stop event propagation to prevent double triggering
                            e.stopPropagation();
                          }}
                          onChange={(e) => {
                            // Log the action and values
                            console.log('Checkbox clicked for:', { sampleId, taskid });
                            handleSelectSample(sampleId, taskid, e.target.checked);
                            // Stop event propagation
                            e.stopPropagation();
                          }}
                        />
                        
                        {/* 图像预览 */}
                        <div style={{ marginRight: '12px', display: 'flex', gap: '8px', alignItems: 'center' }} className="sample-preview-image">
                          <div style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>样本图像</div>
                            <Image
                              width={60}
                              height={60}
                              src={`/wegismarkapi/datasetStore/getSamplePreviewImage?sampleId=${sampleId}`}
                              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
                              style={{ 
                                objectFit: 'cover',
                                borderRadius: '6px',
                                border: '1px solid #d9d9d9'
                              }}
                              placeholder={
                                <div style={{
                                  width: 60,
                                  height: 60,
                                  backgroundColor: '#f5f5f5',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '6px',
                                  border: '1px solid #d9d9d9'
                                }}>
                                  <EyeOutlined style={{ color: '#bfbfbf' }} />
                                </div>
                              }
                            />
                          </div>
                          <div style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>原始影像</div>
                            <Image
                              width={60}
                              height={60}
                              src={`/wegismarkapi/datasetStore/getSampleOriginalImage?sampleId=${sampleId}`}
                              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
                              style={{ 
                                objectFit: 'cover',
                                borderRadius: '6px',
                                border: '1px solid #d9d9d9'
                              }}
                              placeholder={
                                <div style={{
                                  width: 60,
                                  height: 60,
                                  backgroundColor: '#f5f5f5',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '6px',
                                  border: '1px solid #d9d9d9'
                                }}>
                                  <EyeOutlined style={{ color: '#bfbfbf' }} />
                                </div>
                              }
                            />
                          </div>
                        </div>
                        
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontWeight: '500', marginBottom: '8px', fontSize: '14px' }}>
                              {taskname}
                              {samplename && samplename !== taskname && (
                                <span style={{ marginLeft: '8px', color: '#888', fontSize: '12px' }}>
                                  ({samplename})
                                </span>
                              )}
                            </div>
                            <Tag color={`${type == '目标检测' ? '#2db7f5' : '#87d068'}`}>{type}</Tag>
                          </div>
                          <div style={{ alignSelf: 'flex-end', marginTop: '8px' }}>
                            <Popconfirm
                              onConfirm={() => {
                                confirm(sampleId, taskid);
                              }}
                              title="确定要删除吗?"
                              okText="是"
                              cancelText="否"
                            >
                              <Button 
                                type="text" 
                                icon={<DeleteOutlined />} 
                                danger
                                size="small"
                              />
                            </Popconfirm>
                          </div>
                        </div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            ) : searchSampleName ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                未找到与"{searchSampleName}"相关的任务
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                暂无数据
              </div>
            )}
          </div>
        </Card>
      </Col>
      
      {/* 发布共享数据集弹窗 */}
      <Modal
        title="发布共享数据集"
        open={publishModalVisible}
        onCancel={() => setPublishModalVisible(false)}
        onOk={handlePublish}
        confirmLoading={isPublishing}
        okText="发布"
        cancelText="取消"
        width={600}
      >
        <Form
          form={publishForm}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="数据集名称"
            rules={[{ required: true, message: '请输入数据集名称' }]}
          >
            <Input placeholder="请输入数据集名称" />
          </Form.Item>
          <Form.Item
            name="description"
            label="数据集描述"
            rules={[{ required: true, message: '请输入数据集描述' }]}
          >
            <Input.TextArea rows={4} placeholder="请输入数据集描述" />
          </Form.Item>
          <Form.Item
            name="contact"
            label="联系人姓名"
            rules={[{ required: true, message: '请输入联系人姓名' }]}
          >
            <Input placeholder="请输入联系人姓名" />
          </Form.Item>
          <Form.Item
            name="email"
            label="联系邮箱"
            rules={[
              { required: true, message: '请输入联系邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input placeholder="请输入联系邮箱" />
          </Form.Item>
          <Form.Item
            name="goal"
            label="下载所需积分"
            initialValue={0}
            rules={[
              { required: true, message: '请输入下载数据集所需积分' },
              { type: 'number', min: 0, message: '积分不能为负数' }
            ]}
            tooltip="其他用户下载此数据集时需要支付的积分。"
          >
            <InputNumber style={{ width: '100%' }} placeholder="请输入积分" />
          </Form.Item>
        </Form>
        <div style={{ marginTop: '16px', color: '#888' }}>
          注意：发布后，所选样本将被设为公开状态，其他用户可以查看和下载。
        </div>
      </Modal>
      </Row>
    </div>
  );
}
