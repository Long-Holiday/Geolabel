import React from 'react';
import { Modal, Form, Input, DatePicker } from 'antd';
// 封装模态框表单
export default ({ open, onCreate, onCancel, title, formItemList, info }) => {
  const [form] = Form.useForm();

  // 根据配置生成表单项
  const renderFormItems = () => {
    // 如果formItemList是null或undefined，返回null
    if (formItemList == null) {
      return null;
    }
    
    // 如果formItemList是一个React元素，直接返回
    if (React.isValidElement(formItemList)) {
      return formItemList;
    }

    // 如果formItemList是一个数组，处理每个配置项
    if (Array.isArray(formItemList)) {
      return formItemList.map((item, index) => {
        if (React.isValidElement(item)) {
          return item;
        }

        // 根据类型渲染不同的表单项
        let formItem;
        switch (item.type) {
          case 'input':
            formItem = <Input placeholder={`请输入${item.label}`} disabled={item.disabled} />;
            break;
          case 'datePicker':
            formItem = <DatePicker picker="year" style={{ width: '100%' }} />;
            break;
          case 'text':
            formItem = item.render ? item.render() : null;
            break;
          default:
            formItem = <Input placeholder={`请输入${item.label}`} />;
        }

        return (
          <Form.Item
            key={item.key || index}
            label={item.label}
            name={item.name}
            rules={item.rules}
            initialValue={item.initialValue}
          >
            {formItem}
          </Form.Item>
        );
      });
    }

    // 如果是对象但不是React元素，尝试将其转换为字符串
    if (typeof formItemList === 'object') {
      console.warn('FormItemList is an object but not a React element:', formItemList);
      return String(formItemList);
    }

    // 其他类型，直接返回
    return formItemList;
  };

  return (
    <Modal
      open={open}
      title={title}
      okText="确定"
      cancelText="取消"
      onCancel={onCancel}
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
      <Form
        form={form}
        layout="ho"
        name="form_in_modal"
        initialValues={{
          modifier: 'public',
        }}
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 16 }}
      >
        {renderFormItems()}
      </Form>
    </Modal>
  );
};
