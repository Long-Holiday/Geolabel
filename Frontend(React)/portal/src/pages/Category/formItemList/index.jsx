import { Modal, Form, Input } from 'antd';

// 封装模态框表单
export default (
  <>
    {/* <Form.Item
      label="类别编码"
      name="typecode"
      rules={[{ required: true, message: '必须输入类别编码！' }]}
    >
      <Input placeholder="请输入类别编码" />
    </Form.Item> */}

    <Form.Item
      label="类别名称"
      name="typeName"
      rules={[{ required: true, message: '必须输入类别名称！' }]}
    >
      <Input placeholder="请输入类别名称" />
    </Form.Item>
    <Form.Item label="颜色" name="typeColor" rules={[{ required: true, message: '请选择颜色！' }]}>
      <Input placeholder="" type={'color'} />
    </Form.Item>
    <Form.Item label="类别编号" name="typeId" rules={[{ required: true, message: '必须输入类别编号！！' }]}>
      <Input placeholder="请输入类别编号"  />
    </Form.Item>
  </>
);
