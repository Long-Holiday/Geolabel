import { Modal, Form, Input, Select } from 'antd';
import { useEffect } from 'react';

// 封装模态框表单
export default ({ visible, onCreate, onCancel, renderOrgList, defaultValue }) => {
  const [form] = Form.useForm();
  const onChange = (value) => {
    console.log(`selected ${value}`);
  };
  return (
    <Modal
      open={visible}
      title="修改用户信息"
      okText="提交"
      cancelText="取消"
      onCancel={onCancel}
      initialValues={defaultValue}
      destroyOnClose={true}
      afterClose={() => {
        form.resetFields();
      }}
      onOk={() => {
        form
          .validateFields()
          .then((values) => {
            form.resetFields();
            onCreate(values);
          })
          .catch((info) => {
            console.log('Validate Failed:', info);
          });
      }}
    >
      <Form form={form} name="form_in_modal" labelCol={{ span: 6 }} wrapperCol={{ span: 16 }}>
        <Form.Item label="用户编号" name="userid" initialValue={defaultValue.userid}>
          <Input disabled />
        </Form.Item>
        <Form.Item
          label="用户名"
          name="username"
          rules={[{ required: true, message: '必须输入用户名！' }]}
          initialValue={defaultValue.username}
        >
          <Input placeholder="请输入用户名" />
        </Form.Item>

        <Form.Item
          label="用户权限"
          name="isadmin"
          // initialValue={defaultValue.isadmin}
          rules={[{ required: true, message: '必须选择用户权限！' }]}
        >
          <Select placeholder="请选择用户权限" onChange={onChange}>
            <Select.Option value="1">管理员</Select.Option>
            <Select.Option value="0">普通用户</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};
