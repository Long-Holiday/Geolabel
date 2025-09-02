import { Modal } from 'antd';
export default ({ open, onCancel, title, uploadItem }) => {
  return (
    <Modal open={open} title={title} onCancel={onCancel} footer={null} destroyOnClose={true}>
      {uploadItem}
    </Modal>
  );
};
