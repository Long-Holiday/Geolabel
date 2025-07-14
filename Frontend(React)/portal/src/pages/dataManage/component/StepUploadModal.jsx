import React, { useState, useEffect } from 'react';
import { Modal, Steps, Button, Upload, Form, Input, Progress, message, Spin } from 'antd';
import { CloudUploadOutlined, FolderOpenFilled, FolderAddOutlined } from '@ant-design/icons';
import prettyBytes from 'pretty-bytes';
import styles from '../index.less';

const { Step } = Steps;

const StepUploadModal = ({ 
  open, 
  onCancel, 
  onUploadComplete,
  uploadTifFunction,
  uploadSuccessFunction,
  getNowTimeFunction
}) => {
  const [current, setCurrent] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [setName, setSetName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadFile, setCurrentUploadFile] = useState('');
  const [form] = Form.useForm();

  // 重置状态
  const resetState = () => {
    setCurrent(0);
    setSelectedFiles([]);
    setSetName('');
    setUploading(false);
    setUploadProgress(0);
    setCurrentUploadFile('');
    form.resetFields();
  };

  // 关闭模态框
  const handleCancel = () => {
    if (!uploading) {
      resetState();
      onCancel();
    } else {
      message.warning('正在上传中，请等待上传完成');
    }
  };

  // 获取文件扩展名
  const getFileExt = (fileName) => {
    try {
      return fileName.substr(fileName.lastIndexOf('.') + 1).toLowerCase();
    } catch (err) {
      return '';
    }
  };

  // 文件上传配置
  const uploadProps = {
    name: 'tiff',
    multiple: true,
    withCredentials: true,
    beforeUpload: (file) => {
      const isTif = file.type === 'image/tiff';
      if (!isTif) {
        message.error('只能上传TIF文件!');
        return false;
      }
      const isLt1G = file.size / 1024 / 1024 < 6000;
      if (!isLt1G) {
        message.error('文件大小不能超过6G!');
        return false;
      }

      setSelectedFiles((prevFiles) => [...prevFiles, file]);
      return false;
    },
    onRemove: (file) => {
      setSelectedFiles((prevFiles) => prevFiles.filter(f => f.uid !== file.uid));
    },
    fileList: selectedFiles,
  };

  // 下一步
  const next = () => {
    if (current === 0) {
      if (selectedFiles.length === 0) {
        message.error('请选择文件!');
        return;
      }
    }
    setCurrent(current + 1);
  };

  // 上一步
  const prev = () => {
    setCurrent(current - 1);
  };

  // 开始上传
  const startUpload = async () => {
    try {
      const values = await form.validateFields();
      setSetName(values.setName);
      setCurrent(2);
      setUploading(true);
      
      // 开始上传文件
      await uploadMultipleFiles(values.setName);
      
    } catch (error) {
      console.log('验证失败:', error);
    }
  };

  // 上传多个文件
  const uploadMultipleFiles = async (setNameValue) => {
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setCurrentUploadFile(file.name);
        setUploadProgress(Math.round((i / selectedFiles.length) * 100));
        
        await uploadSingleFile(file, setNameValue);
      }
      
      setUploadProgress(100);
      message.success('所有文件上传成功!');
      
      // 延迟关闭，让用户看到完成状态
      setTimeout(() => {
        setUploading(false);
        resetState();
        onUploadComplete();
        onCancel();
      }, 1500);
      
    } catch (error) {
      message.error('上传失败: ' + error.message);
      setUploading(false);
    }
  };

  // 上传单个文件
  const uploadSingleFile = async (file, setNameValue) => {
    const chunkSize = 1024 * 1024 * 20; // 20MB
    const [fname, fext] = file.name.split('.');
    let chunkIndex = 0;

    while (true) {
      const start = chunkIndex * chunkSize;
      if (start >= file.size) {
        // 文件上传完成，调用成功接口
        await uploadSuccessFunction({
          fileName: file.name,
          updatetime: getNowTimeFunction(),
          size: prettyBytes(file.size),
          setName: setNameValue,
        });
        break;
      }

      const blob = file.slice(start, start + chunkSize);
      const blobName = `${fname}.${chunkIndex}.${fext}`;
      const blobFile = new File([blob], blobName);
      const formData = new FormData();
      formData.append('file', blobFile);

      await uploadTifFunction(formData);
      chunkIndex++;
    }
  };

  // 步骤内容
  const steps = [
    {
      title: '选择文件',
      content: (
        <div className={styles.stepContent}>
          <div className={styles.uploader}>
            <div className={styles.uploadIcon}>
              <p>
                <CloudUploadOutlined style={{ fontSize: '4em' }} />
              </p>
              <p>导入光学遥感影像数据</p>
            </div>
            <div>
              <Upload {...uploadProps}>
                <Button type="primary">
                  <FolderOpenFilled style={{ color: 'white' }} />
                  选择文件
                </Button>
              </Upload>
            </div>
          </div>
          <div className={styles.limit}>
            只支持上传 EPSG:3857 的 GeoTIFF 文件，且大小不超过6G
          </div>
          
          {selectedFiles.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 'bold' }}>
                已选择的文件：
              </div>
              {selectedFiles.map((file, index) => (
                <div key={file.uid} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginBottom: 8,
                  padding: '8px',
                  background: '#f5f5f5',
                  borderRadius: '4px'
                }}>
                  <span>
                    <FolderAddOutlined style={{ marginRight: 8 }} />
                    {file.name}
                  </span>
                  <span>{prettyBytes(file.size || 0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '输入影像集名称',
      content: (
        <div className={styles.stepContent}>
          <Form form={form} layout="vertical">
            <Form.Item
              label="影像集名称"
              name="setName"
              rules={[{ required: true, message: '请输入影像集名称!' }]}
            >
              <Input placeholder="请输入影像集名称" />
            </Form.Item>
          </Form>
          
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 'bold' }}>
              将要上传的文件：
            </div>
            {selectedFiles.map((file, index) => (
              <div key={file.uid} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginBottom: 8,
                padding: '8px',
                background: '#f5f5f5',
                borderRadius: '4px'
              }}>
                <span>
                  <FolderAddOutlined style={{ marginRight: 8 }} />
                  {file.name}
                </span>
                <span>{prettyBytes(file.size || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: '正在上传',
      content: (
        <div className={styles.stepContent}>
          <Spin tip="上传中...请不要关闭页面" size="large" spinning={uploading}>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ marginBottom: 16 }}>
                <h3>正在上传文件到影像集: {setName}</h3>
              </div>
              
              {currentUploadFile && (
                <div style={{ marginBottom: 16 }}>
                  <p>当前上传文件: {currentUploadFile}</p>
                </div>
              )}
              
              <Progress 
                percent={uploadProgress} 
                status={uploading ? "active" : "success"}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
              
              <div style={{ marginTop: 16 }}>
                <p>已上传 {selectedFiles.length} 个文件中的 {Math.ceil(uploadProgress / 100 * selectedFiles.length)} 个</p>
              </div>
            </div>
          </Spin>
        </div>
      ),
    },
  ];

  return (
    <Modal
      title="上传影像文件"
      open={open}
      onCancel={handleCancel}
      width={800}
      footer={null}
      destroyOnClose={true}
      maskClosable={!uploading}
    >
      <Steps current={current} style={{ marginBottom: 24 }}>
        {steps.map(item => (
          <Steps.Step key={item.title} title={item.title} />
        ))}
      </Steps>
      
      <div className="steps-content" style={{ minHeight: 300 }}>
        {steps[current].content}
      </div>
      
      <div className="steps-action" style={{ marginTop: 24, textAlign: 'right' }}>
        {current > 0 && current < 2 && (
          <Button style={{ margin: '0 8px' }} onClick={prev}>
            上一步
          </Button>
        )}
        {current === 0 && (
          <Button type="primary" onClick={next} disabled={selectedFiles.length === 0}>
            下一步
          </Button>
        )}
        {current === 1 && (
          <Button type="primary" onClick={startUpload}>
            开始上传
          </Button>
        )}
        {current === 2 && !uploading && (
          <Button type="primary" onClick={handleCancel}>
            完成
          </Button>
        )}
      </div>
    </Modal>
  );
};

export default StepUploadModal; 