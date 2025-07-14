import { Input, Form } from 'antd';
export default (
  <>
    <Form.Item
      label="文件名称"
      name="sername"
      rules={[
        { required: true, message: '必须输入文件名称' },
        {
          pattern: /^[0-9a-zA-Z._]{1,}$/,
          message: '文件名不能包含中文和空格！',
        },
      ]}
    >
      <Input placeholder="请输入文件名称" />
    </Form.Item>{' '}
  </>
);
