import { PageContainer } from '@ant-design/pro-layout';
import MyDatasetTab from '../datasetStore/component/myDatasetTab';
import { useModel } from 'umi';
import './style.less';

export default function MyDatasets() {
  const { initialState } = useModel('@@initialState');
  const currentState = initialState?.currentState || {};

  return (
    <PageContainer
      title="已兑换的共享数据集"
      subTitle="管理您已兑换的共享数据集，支持免费下载"
      className="my-datasets-page"
    >
      <MyDatasetTab currentState={currentState} />
    </PageContainer>
  );
} 