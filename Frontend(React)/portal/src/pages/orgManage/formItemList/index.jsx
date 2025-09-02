import { Input, Form } from 'antd';
export default (
  <>
    <Form.Item
      label="机构名称"
      name="unitname"
      rules={[{ required: true, message: '必须输入机构名称！' }]}
    >
      <Input placeholder="请输入机构名称" />
    </Form.Item>
    <Form.Item label="描述" name="unitdesc" rules={[{ required: true, message: '必须输入描述！' }]}>
      <Input placeholder="请输机构描述" />
    </Form.Item>
  </>
);
