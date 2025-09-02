import { PageContainer } from '@ant-design/pro-layout';
import { Tabs } from 'antd';
import SharedDatasetTab from '../datasetStore/component/sharedDatasetTab';
import MyDatasetTab from '../datasetStore/component/myDatasetTab';
import { useModel } from 'umi';
import './style.less';

const { TabPane } = Tabs;

export default function DataCommunity() {
  const { initialState } = useModel('@@initialState');
  const currentState = initialState?.currentState || {};

  return (
    <PageContainer
      title="数据社区"
      subTitle="浏览、兑换和管理社区共享的高质量标注数据集"
      className="data-community-page"
    >
      <div className="data-community-content">
        <Tabs defaultActiveKey="shared" size="large" className="community-tabs">
          <TabPane tab="共享数据集" key="shared">
            <SharedDatasetTab currentState={currentState} />
          </TabPane>
          <TabPane tab="已兑换的数据集" key="exchanged">
            <MyDatasetTab currentState={currentState} />
          </TabPane>
        </Tabs>
      </div>
    </PageContainer>
  );
} 