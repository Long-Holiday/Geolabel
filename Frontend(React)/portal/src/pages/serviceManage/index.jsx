import { ProList } from '@ant-design/pro-components';
import { DeleteTwoTone, CheckCircleOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-layout';
import { Tag, Popconfirm, Button, Drawer, message } from 'antd';
import { useModel } from 'umi';
import { useState, useEffect, useRef } from 'react';
import { reqServiceList, reqDeleteService, reqDelGeoserver } from '@/services/serviceManage/api';
import MyDrawer from './components/MyDrawer.jsx';
import './css.css';
export default () => {
  const [currentService, setCurrentService] = useState([]);
  const [visible, setVisible] = useState(false);
  const { serverList, getServerList } = useModel('serverModel');
  const actionRef = useRef();
  // 创建变量控制页面重载
  const [total, setTotal] = useState(10); // 重载数据
  const reload = () => {
    setTotal((pre) => pre + 1);
  };
  // 展示预览抽屉
  const showEditModal = (item) => {
    setVisible(true);
    setCurrentService(item);
  };
  useEffect(async () => {
    getServerList();
    // 在此执行发请求
    // try {
    //   let result = await reqServiceList();
    //   //用户列表
    //   if (result.success) {
    //     setServiceList(result.data);
    //     console.log(result.data);
    //   }
    // } catch (error) {
    //   message.error('服务加载失败！');
    //   console.log(error);
    // }
  }, [total]);
  // let data2 = serviceList.map(
  let data2 = serverList.map(
    (item) => {
      return {
        title: item.serName,
        content: (
          <div style={{ display: 'flex', width: '100%' }}>
            <div style={{ flex: 1 }} className="serviceInfo-list">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                <p>服务描述：{item.serDesc}</p>
                <p>影像年份：{item.serYear}</p>
                <p>发布人：{item.publisher}</p>
                <p>发布时间：{item.publishTime}</p>
                <p>发布地址：...</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Button
                type="primary"
                onClick={() => {
                  showEditModal(item);
                }}
              >
                详情
              </Button>
              <Popconfirm
                title="确定要删除吗？"
                onConfirm={async () => {
                  try {
                    //TODO 后期再完善，现在先注释
                    /*let result2 = await reqDelGeoserver(item.serName);
                    console.log(result2);*/
                    let result = await reqDeleteService(item.serName);
                    if (result) {
                      message.success('删除成功！');
                      reload();
                    }
                    console.log(item, 'item');
                  } catch (error) {
                    message.error('删除失败!');
                    console.log(error);
                  }
                }}
              >
                <Button type="text" danger style={{ marginLeft: '10px' }}>
                  <DeleteTwoTone twoToneColor="#cd201f" />
                </Button>
              </Popconfirm>
            </div>
          </div>
        ),
      };
    },
    // ],
  );
  return (
    <PageContainer>
      <div
        style={{
          backgroundColor: '#f0f2f5',
          margin: -24,
          padding: 24,
        }}
      >
        <ProList
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: false,
          }}
          rowKey="title"
          showActions="always"
          actionRef={actionRef}
          /* onItem={(record) => {
          return {
            onMouseEnter: () => {
              console.log(record);
            },
            onClick: () => {
              console.log(record);
            },
          };
        }} */
          metas={{
            title: {
              render: (text) => <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{text}</div>,
            },
            content: {},
          }}
          headerTitle="服务列表"
          dataSource={data2}
         />
        <MyDrawer
          content={currentService}
          visible={visible}
          onClose={() => {
            setVisible(false);
          }}
        />
      </div>
    </PageContainer>
  );
};
