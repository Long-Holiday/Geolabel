import {
  EditTwoTone,
  DeleteTwoTone,
  UploadOutlined,
  CloudUploadOutlined,
  FolderOpenFilled,
  FolderAddOutlined,
} from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-table';
import { Button, Popconfirm, message, Upload, Form, Input, DatePicker, Progress, Spin, Modal } from 'antd';
import { useModel, request } from 'umi';
import { useRef, useState } from 'react';
import {
  reqGetfileData,
  reqPublishVectorData,
  reqDeleteVectorData,
  reqUploadTifs,
  reqUploadSuccess,
  reqEditfileData,
  reqDeleteFileData,
  reqGetLayers,
  reqPublishSet,
} from '@/services/dataManage/api';
import { PageContainer } from '@ant-design/pro-layout';
import CollectionCreateForm from '@/components/CollectionCreateForm';
import StepUploadModal from '../component/StepUploadModal.jsx';
import { getOrgList } from '@/services/orgManage/api.js';
import { set } from 'lodash';
import styles from '../index.less';
import prettyBytes from 'pretty-bytes';
import { getNowTime } from '@/utils/utils.js';
import {
  reqCreateDataStore,
  reqGetFilePath,
  reqPublishTifServer,
  reqTestGeoserver,
  reqTestGeoserver2,
} from '@/services/serviceManage/api.js';

const Category = () => {
  const actionRef = useRef();
  // 控制模态框显示影藏
  const [visible, setVisible] = useState(false); // 发布服务模态框开关
  const [publishState, setPublishState] = useState(false); //发布服务状态
  const [stepUploadVisible, setStepUploadVisible] = useState(false); // 分步上传模态框开关
  const [formitemList, setFormitemList] = useState({}); //上传模态框
  const [title, setTitle] = useState(''); //模态框标题
  const { initialState } = useModel('@@initialState');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [form] = Form.useForm();
  // 获取当前用户
  const { currentState } = initialState;
  // 获取文件扩展名
  const getFileExt = (fileName) => {
    try {
      return fileName.substr(fileName.lastIndexOf('.') + 1).toLowerCase();
    } catch (err) {
      return '';
    }
  };

  // 处理上传完成
  const handleUploadComplete = () => {
    actionRef.current.reload();
  };

  // 单文件发布表单
  const generateFormList = (fileInfo, currentUser) => {
    return (
      <>
        <Form.Item
          label="文件名称"
          name="filename"
          initialValue={fileInfo.fileName}
          rules={[
            { required: true, message: '必须输入文件名称+扩展名！！' },
            {
              pattern: /\w+/,
              message: '文件名不能包含中文或空格！',
            },
            {
              pattern: /.tiff?$/,
              message: '请检查扩展名是否正确！',
            },
          ]}
        >
          <Input placeholder="请输入文件名称" allowClear disabled />
        </Form.Item>
        <Form.Item
          label="服务描述"
          name="serdesc"
          rules={[{ required: true, message: '必须输入服务描述！' }]}
        >
          <Input placeholder="请输入服务描述" />
        </Form.Item>
        <Form.Item
          label="服务年份"
          name="seryear"
          rules={[{ required: true, message: '必须选择年份！', type: 'object' }]}
        >
          <DatePicker
            picker="year"
            onChange={(date, dateString) => {
              console.log(date, dateString);
            }}
          />
        </Form.Item>
        <Form.Item
          label="发布人"
          name="publisher"
          initialValue={currentUser}
          rules={[{ required: true }]}
        >
          <Input disabled />
        </Form.Item>
      </>
    );
  };

  // 批量发布服务表单
  const generateBatchPublishForm = (currentUser) => {
    return (
      <>
        <Form.Item
          label="服务描述"
          name="serdesc"
          rules={[{ required: true, message: '必须输入服务描述！' }]}
        >
          <Input placeholder="请输入服务描述" />
        </Form.Item>
        <Form.Item
          label="服务年份"
          name="seryear"
          rules={[{ required: true, message: '必须选择年份！', type: 'object' }]}
        >
          <DatePicker
            picker="year"
            onChange={(date, dateString) => {
              console.log(date, dateString);
            }}
          />
        </Form.Item>
        <Form.Item
          label="发布人"
          name="publisher"
          initialValue={currentUser}
          rules={[{ required: true }]}
        >
          <Input disabled />
        </Form.Item>
      </>
    );
  };

  // 批量发布服务
  const handlePublishSelected = async () => {
    if (selectedRowKeys.length === 0) {
      message.error('请选择要发布的影像!');
      return;
    }
    
    // 显示表单让用户填写服务信息
    setFormitemList(generateBatchPublishForm(currentState?.currentUser));
    setTitle('批量发布服务');
    setVisible(true);
  };
  
  // 批量发布服务创建回调
  const onCreateBatch = async (values) => {
    // 格式化日期，只要年份
    const dateValue = values['seryear'];
    
    let time = new Date();
    time = time.toLocaleString().split(' ')[0].split('/').join('-') + 
           ' ' + time.toLocaleString().split(' ')[1];
    
    const batchPublishData = {
      fileIds: selectedRowKeys,
      serdesc: values['serdesc'],
      seryear: dateValue.format('YYYY'),
      publisher: values['publisher'],
      publishtime: time
    };
    
    console.log('批量发布参数:', batchPublishData);
    
    const hide = message.loading('正在批量发布服务，请稍候...', 0);
    
    try {
      const result = await reqPublishSet(batchPublishData);
      
      setVisible(false);
      
      if (result.code) {
        hide();
        actionRef.current.reload();
        message.success('批量发布任务已提交，正在后台处理');
      } else {
        hide();
        message.error('发布失败: ' + result.message);
      }
    } catch (error) {
      hide();
      message.error('发布服务出错: ' + error.message);
      console.log(error);
      setVisible(false);
    }
  };

  // 发布服务请求回调
  const onCreate = async (values) => {
    // 如果是批量发布
    if (title === '批量发布服务') {
      return onCreateBatch(values);
    }
    
    // 单个发布的逻辑
    // 格式化日期，只要年份
    const dateValue = values['seryear'];
    const sername = values['filename'].split('.')[0];

    let time = new Date();
    console.log(time.toLocaleString());
    time =
      time.toLocaleString().split(' ')[0].split('/').join('-') +
      ' ' +
      time.toLocaleString().split(' ')[1];
    values = {
      ...values,
      seryear: dateValue.format('YYYY'),
      publishtime: time,
      sername,
    };
    const hide = message.loading('正在发布', 0);
    // 需要发送四次请求
    try {
      // 第一次请求，获取文件存储路径
      let pathResult = await reqGetFilePath({ filename: values['filename'] });
      // 第二次请求，新建Geoserver仓库
      const createStoreResult = await reqCreateDataStore(sername, pathResult.data);
      //  第三次请求，发布geoserver服务
      let geoResult = await reqTestGeoserver2(sername);
      let publishUrl="http://localhost:8081/geoserver/rest/workspaces/LUU/coveragestores/"+sername+"/coverages"
      values = {
        ...values,
        publishUrl,
      };
      // 第四次请求，数据库记录服务
      let result = await reqPublishTifServer(values);
      setVisible(false);
      console.log(result);
      if (result) {
        hide();
        actionRef.current.reload();
        message.success('发布成功！');
      } else {
        message.error('当前服务已存在！');
      }
    } catch (error) {
      hide();
      message.error('发布失败，请联系管理员！');
      console.log(error);
      setVisible(false);
      return false;
    }
  };

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => {
      setSelectedRowKeys(keys);
    },
  };

  //  表格内容
  const columns = [
    {
      title: '序号',
      dataIndex: 'index',
      key: 'indexBorder',
      width: '10%',
      search: false,
      editable: false,
      align: 'center',
      valueType: 'indexBorder',
    },
    {
      disable: true,
      title: '文件名称',
      dataIndex: 'fileName',
      align: 'center',
      ellipsis: true,
      // width: 280,
      formItemProps: {
        rules: [
          {
            required: true,
            message: '此项为必填项',
          },
          {
            // pattern: /^[a-zA-Z0-9]+$/,
            // pattern: /^[a-zA-Z0-9]+$/,
            pattern: /\w+/,
            message: '文件名不能包含中文或空格！',
          },
          {
            pattern: /.tiff?$/,
            message: '扩展名应为 .tif或 .tiff!',
          },
        ],
      },
    },
    {
      title: '所属影像集',
      dataIndex: 'setName',
      align: 'center',
      ellipsis: true,
      formItemProps: {
        rules: [
          {
            required: false,
          },
        ],
      },
    },
    {
      title: '修改时间',
      dataIndex: 'updateTime',
      ellipsis: true,
      align: 'center',
      editable: false,
    },
    {
      title: '大小',
      dataIndex: 'size',
      width: 200,
      ellipsis: true,
      align: 'center',
      editable: false,
    },
    {
      title: '状态',
      align: 'center',
      width: 120,
      dataIndex: 'status',
      editable: false,
      valueEnum: {
        0: { text: '未发布', status: 'Default' },
        1: { text: '已发布', status: 'Success' },
      },
    },
    {
      title: '操作',
      valueType: 'option',
      ellipsis: true,
      width: 280,
      align: 'center',
      render: (text, record, index, action) =>
        !record.status
          ? [
              <EditTwoTone
                key="editable"
                onClick={() => {
                  var _a;
                  (_a = action === null || action === void 0 ? void 0 : action.startEditable) ===
                    null || _a === void 0
                    ? void 0
                    : _a.call(action, record.fileId);
                }}
              />,
              <Popconfirm
                title="确定要删除吗？"
                key="delete"
                onConfirm={async () => {
                  try {
                    debugger
                    let result = await reqDeleteFileData(record.fileName);
                    if (result.code) {
                      message.success('删除成功！');
                      actionRef.current.reload();
                    }
                  } catch (error) {
                    message.error('删除失败！');
                  }
                }}
              >
                <DeleteTwoTone twoToneColor="#cd201f" />
              </Popconfirm>,
              <Button
                type="primary"
                size="small"
                key="fabu"
                onClick={async () => {
                  // setFileInfo(record);
                  setFormitemList(generateFormList(record, currentState?.currentUser));
                  setTitle('发布矢量数据');
                  // setOrg(org1.data);
                  setVisible(true);
                }}
              >
                发布
              </Button>,
            ]
          : ['无'],
    },
  ];
  // 可编辑表格设置
  const editable = {
    type: 'multiple',
    // 保存的回调
    onSave: async (key, row, originRow) => {
      console.log(row, originRow);
      try {
        let result = await reqEditfileData({
          ...row,
          originfilename: originRow.filename,
          updatetime: getNowTime(),
        });
        if (result.code == 200) {
          message.success('修改成功！');
          actionRef.current.reload();
        } else if (result.code == 23505) {
          message.error('文件名重复！');
          actionRef.current.reload();
        }
      } catch (error) {
        message.error('修改失败！');
        row = originRow;
        return;
      }
    },
    // 删除的回调
    onDelete: async (_, row) => {
      try {
        let result = await reqDeleteFileData(row.filename);
        if (result.code) {
          message.success('删除成功！');
        }
      } catch (error) {
        message.error('删除失败！');
      }
    },
  };
  return (
    <PageContainer>
      <ProTable
        columns={columns}
        actionRef={actionRef}
        request={(params, sorter, filter) => {
          // 添加表单中的setName值到请求参数
          const formValues = form.getFieldsValue();
          return reqGetfileData({
            ...params,
            setName: formValues.setName,
          });
        }}
        editable={editable}
        rowKey="fileId"
        search={{
          labelWidth: 120,
        }}
        rowSelection={rowSelection}
        form={{
          form,
          submitter: {
            searchConfig: {
              submitText: '查询',
              resetText: '重置',
            },
          },
        }}
        pagination={{
          pageSizeOptions: ['8', '12', '16', '20'],
          defaultPageSize: 8,
          showSizeChanger: true,
        }}
        headerTitle="影像数据管理"
        toolBarRender={() => [
          <Button
            key="button"
            icon={<UploadOutlined />}
            type="primary"
            onClick={() => {
              setStepUploadVisible(true);
              setTitle('上传数据');
            }}
          >
            上传
          </Button>,
          <Button
            key="publish"
            type="primary"
            disabled={selectedRowKeys.length === 0}
            onClick={handlePublishSelected}
          >
            发布选中影像为服务
          </Button>,
        ]}
      />
      <StepUploadModal
        title={title}
        open={stepUploadVisible}
        onCancel={() => {
          setStepUploadVisible(false);
        }}
        onUploadComplete={handleUploadComplete}
        uploadTifFunction={reqUploadTifs}
        uploadSuccessFunction={reqUploadSuccess}
        getNowTimeFunction={getNowTime}
      />

      <CollectionCreateForm
        formItemList={formitemList}
        title={title}
        open={visible}
        onCreate={onCreate}
        onCancel={() => {
          setVisible(false);
        }}
      />
    </PageContainer>
  );
};

export default Category;
