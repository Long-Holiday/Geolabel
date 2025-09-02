import { PlusOutlined, EditTwoTone } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-layout';
import { ProTable } from '@ant-design/pro-table';
import { Button, Tag, message } from 'antd';
import { useRef, useState } from 'react';
import {
  reqGetCategoryList,
  reqNewCategory,
  reqDeleteCategory,
  reqEditCategory,
} from '@/services/category/api.js';
// 引入封装模态框表单
import CollectionCreateForm from '@/components/CollectionCreateForm';
import formItemList from './formItemList/index';
const columns = [
  {
    title: '类别编码',
    dataIndex: 'typeId',
    key: 'typeId',
    width: '5%',
    // search: false,
    editable: false,
    align: 'center',
  },
  // {
  //   title: '类别编码',
  //   dataIndex: 'typecode',
  //   width: '25%',
  //   align: 'center',
  //   formItemProps: {
  //     rules: [
  //       {
  //         required: true,
  //         message: '此项为必填项',
  //       },
  //     ],
  //   },
  // },
  {
    disable: true,
    title: '类别名称',
    dataIndex: 'typeName',
    width: '25%',
    align: 'center',
  },
  {
    title: '颜色',
    dataIndex: 'typeColor',
    width: '15%',
    align: 'center',
    valueType: 'color',
    search: false,
    // 渲染多个需要加数组框
    render: (_, record, index) => [
      <Tag color={record.typeColor} key={record.typeId} style={{ width: 20, height: 20 }} />,
    ],
  },
  {
    title: '操作',
    valueType: 'option',
    width: '10%',
    key: 'option',
    align: 'center',
    render: (text, record, index, action) => [
      <EditTwoTone
        key="editable"
        onClick={() => {
          var _a;
          (_a = action === null || action === void 0 ? void 0 : action.startEditable) === null ||
          _a === void 0
            ? void 0
            : _a.call(action, record.typeId);
        }}
      >
        编辑
      </EditTwoTone>,
    ],
  },
];
const Category = () => {
  const actionRef = useRef();
  // 控制模态框显示影藏
  const [visible, setVisible] = useState(false);
  // 新建类别参数收集
  const onCreate = async (values) => {
    console.log('得到新建类别参数: ', values);
    const hide = message.loading('正在添加');
    try {
      setVisible(false);
      let result = await reqNewCategory(values);
      hide();
      console.log(result);
      if (result) {
        message.success('添加成功！');
        actionRef.current.reload();
      }
    } catch (error) {
      hide();
      message.error('添加失败！');
      setVisible(false);
      return false;
    }
  };
  return (
    <PageContainer>
      <ProTable
        columns={columns}
        actionRef={actionRef}
        request={reqGetCategoryList}
        editable={{
          type: 'multiple',
          // 保存的回调
          onSave: async (key, row, originRow) => {
            const { typeid, typecolor, typename, typecode } = row;
            try {
              // let result = await reqEditCategory({ typeid, typecolor, typename, typecode });
              console.log("修改参数为")
              console.log(row)
              let result = await reqEditCategory(row);
              if (result) {
                message.success('修改成功！');
                actionRef.current.reload();
              }
            } catch (error) {
              message.error('修改失败！');
              return;
            }
          },
          onDelete: async (_, row, index, action) => {
            try {
              let result = await reqDeleteCategory(row.typeId);
              // 修改数据数量，不然会报错
              actionRef.current.pageInfo.total -= 1;
              actionRef.current.reloadAndRest();
              message.success('删除成功！');
              console.log(actionRef.current);
            } catch (error) {
              message.error('删除失败！');
            }
          },
        }}
        rowKey="typeId"
        search={{
          labelWidth: 'auto',
        }}
        pagination={{
          pageSizeOptions: ['5', '10', '15', '20'],
          defaultPageSize: 5,
          showSizeChanger: true,
        }}
        headerTitle="类别配置"
        toolBarRender={() => [
          <Button
            key="button"
            icon={<PlusOutlined />}
            type="primary"
            onClick={() => {
              setVisible(true);
            }}
          >
            类别新增
          </Button>,
          <CollectionCreateForm
            title={'新建标注类别'}
            open={visible}
            onCreate={onCreate}
            onCancel={() => {
              setVisible(false);
            }}
            formItemList={formItemList}
          />,
        ]}
      />
    </PageContainer>
  );
};

export default Category;
