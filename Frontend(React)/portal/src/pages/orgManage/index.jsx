import { PlusOutlined } from '@ant-design/icons';
import { Button, message, Input, Form, Modal, Switch, Popconfirm } from 'antd';
import React, { useState, useRef } from 'react';
import { PageContainer } from '@ant-design/pro-layout';
import ProTable from '@ant-design/pro-table';
// 引入接口方法
import { getOrgList, reqNewOrg, reqDeleteOrg } from '@/services/orgManage/api';
// 引入封装的模态框
import CollectionCreateForm from '@/components/CollectionCreateForm';
// 引入表单内容
import formItemList from './formItemList/index';

// 机构列表组件
const TableList = () => {
  // 控制表格状态的 ref
  const actionRef = useRef();
  // 确认删除回调函数
  const deleteRef = useRef();
  const confirm = async (e) => {
    console.log(deleteRef.current.id);
    // 获取删除数据的 id
    const orgId = deleteRef.current.id;
    // 发送请求
    const result = await reqDeleteOrg(orgId);
    if (result) {
      console.log(actionRef.current.pageInfo.total);
      // 此处需要更新页码的 total ,不然会报错
      actionRef.current.pageInfo.total -= 1;
      // 刷新并清空,页码也会重置，不包括表单
      actionRef.current.reloadAndRest();
      message.success('删除成功！');
    }
  };

  // 控制模态框显示影藏
  const [visible, setVisible] = useState(false);
  //  新增数据的请求
  const onCreate = async (values) => {
    console.log(`通过校验并拿到数据`, values);
    const { unitdesc, unitname } = values;
    let obj = { unitname, unitdesc };
    console.log(obj);
    // 新增用户的回调
    const hide = message.loading('正在添加');
    try {
      let result = await reqNewOrg(obj);
      hide();
      if (result) {
        message.success('添加成功！');
        actionRef.current.pageInfo.total += 1;
        actionRef.current.reload();
        console.log(result);
        setVisible(false);
        return true;
      }
    } catch (error) {
      hide();
      message.error('添加失败！');
      setVisible(false);
      return false;
    }
  };
  const columns = [
    {
      title: '机构名称',
      dataIndex: 'unitname',
      valueType: 'textarea',
      key: 'unitname', //用于搜索时生成带给后端的参数
      width: '40%',
    },
    {
      title: '描述',
      dataIndex: 'unitdesc',
      valueType: 'textarea',
      key: 'unitdesc',
      width: '40%',
    },
    {
      title: '操作',
      dataIndex: 'unitid',
      valueType: 'option',
      render: (_, record, index) => [
        record.unitid != 1 && (
          <Popconfirm
            title="确定要删除吗？"
            onConfirm={confirm}
            okText="确定"
            cancelText="取消"
            key={record.unitid}
          >
            <a href="#" ref={deleteRef} id={record.unitid} key="config">
              删除
            </a>
          </Popconfirm>
        ),
      ],
    },
  ];
  return (
    <PageContainer>
      <ProTable
        actionRef={actionRef} //数据发生变化时重新加载
        headerTitle="微集思机构管理"
        rowKey="unitid"
        search={{
          labelWidth: 120,
        }}
        toolBarRender={() => [
          <Button
            type="primary"
            key="primary"
            onClick={() => {
              setVisible(true);
            }}
          >
            <PlusOutlined /> 新建
          </Button>,
        ]}
        request={getOrgList}
        columns={columns}
      />
      <CollectionCreateForm
        title={'新增机构'}
        formItemList={formItemList}
        open={visible}
        onCreate={onCreate}
        onCancel={() => {
          setVisible(false);
        }}
      />
    </PageContainer>
  );
};
// 机构列表组件

export default TableList;
