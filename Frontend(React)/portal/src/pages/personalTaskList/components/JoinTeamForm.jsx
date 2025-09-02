import { Modal, Form, Input } from 'antd';

/**
 * 加入团队表单模态框
 * @param {Object} props 组件属性
 * @param {boolean} props.visible 是否可见
 * @param {Function} props.onJoin 提交回调
 * @param {Function} props.onCancel 取消回调
 */
const JoinTeamForm = ({ visible, onJoin, onCancel }) => {
  const [form] = Form.useForm();

  return (
    <Modal
      open={visible}
      title="加入团队"
      okText="加入"
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
            onJoin(values);
          })
          .catch((info) => {
            console.log('Validate Failed:', info);
          });
      }}
    >
      <Form form={form} name="join_team_form" labelCol={{ span: 6 }} wrapperCol={{ span: 16 }}>
        <Form.Item
          label="团队码"
          name="teamCode"
          rules={[{ required: true, message: '请输入团队码！' }]}
        >
          <Input placeholder="请输入6位数字团队码" maxLength={6} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default JoinTeamForm; 