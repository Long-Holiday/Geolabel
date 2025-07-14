import { PageContainer } from '@ant-design/pro-layout';
import TabChild from './component/tabChild';
import { useModel } from 'umi';
import './style.less';

export default function datasetStore() {
  const { initialState } = useModel('@@initialState');
  const currentState = initialState?.currentState || {};

  return (
    <PageContainer
      title="样本集管理"
      subTitle="管理您的标注样本数据，支持下载和发布共享"
      className="dataset-store-page"
    >
      <TabChild currentState={currentState} />
    </PageContainer>
  );
}
