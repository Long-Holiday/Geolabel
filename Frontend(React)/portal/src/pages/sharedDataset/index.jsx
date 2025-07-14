import { PageContainer } from '@ant-design/pro-layout';
import SharedDatasetTab from '../datasetStore/component/sharedDatasetTab';
import { useModel } from 'umi';
import './style.less';

export default function SharedDataset() {
  const { initialState } = useModel('@@initialState');
  const currentState = initialState?.currentState || {};

  return (
    <PageContainer
      title="共享数据集"
      subTitle="浏览和下载社区共享的高质量标注数据集"
      className="shared-dataset-page"
    >
      <SharedDatasetTab currentState={currentState} />
    </PageContainer>
  );
} 