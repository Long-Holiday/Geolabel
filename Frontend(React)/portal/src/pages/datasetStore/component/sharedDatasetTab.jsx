import { Button, Card, Col, Row, Tag, message, Checkbox, Input, Modal, Form, Image } from 'antd';
import '../style.less';
import { useCallback, useEffect, useState } from 'react';
import {
  reqDownloadSharedDataset,
  reqGetAllSharedDatasets,
  reqExchangeSharedDataset,
} from '@/services/dataset/api';
import { DownloadOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons';

export default function SharedDatasetTab({
  currentState = {}, // 提供默认值
}) {
  // 正确获取currentUser和isAdmin
  const currentUser = currentState?.currentUser || {};
  const isAdmin = currentState?.isAdmin === 1;
  
  // 如果currentUser是字符串，那么它就是用户名
  const isCurrentUserString = typeof currentUser === 'string';
  
  // 从currentUser中获取userId和username
  const userId = isCurrentUserString ? null : (currentUser?.userid || currentUser?.user_id || currentUser?.id);
  const username = isCurrentUserString ? currentUser : (currentUser?.username || '');
  
  console.log('完整的currentState:', currentState);
  console.log('currentUser:', currentUser);
  console.log('currentUser类型:', typeof currentUser);
  
  // 数据集状态
  const [datasets, setDatasets] = useState([]);
  // 选中的数据集
  const [selectedDatasets, setSelectedDatasets] = useState([]);
  // 搜索关键词
  const [searchName, setSearchName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  // 图像预览状态
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImages, setPreviewImages] = useState([]);
  const [previewTitle, setPreviewTitle] = useState('');

  // 加载共享数据集数据
  const loadDatasets = async () => {
    try {
      console.log('获取所有共享数据集');
      
      setIsSearching(true);
      
      // 使用新的API获取所有数据集
      const result = await reqGetAllSharedDatasets();
      
      if (result.code == 200) {
        const filteredDatasets = searchName 
          ? result.data.filter(dataset => dataset.name && dataset.name.includes(searchName))
          : result.data;
          
        setDatasets(filteredDatasets || []);
        console.log('共享数据集数量:', filteredDatasets?.length || 0);
        console.log('共享数据集数据:', filteredDatasets);
      } else {
        console.error('API返回错误:', result);
        message.error(`获取共享数据集失败: ${result.message || '未知错误'}`);
      }
    } catch (error) {
      message.error('共享数据集获取失败，请联系管理员');
      console.error('API错误:', error);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    console.log('获取共享数据集信息');
    loadDatasets();
  }, []);

  // 处理搜索按钮点击
  const handleSearch = () => {
    console.log('执行搜索，关键词:', searchName);
    loadDatasets();
  };

  // 处理输入框按下回车
  const handleInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 处理清除搜索
  const handleClearSearch = () => {
    setSearchName('');
    loadDatasets();
  };

  // 处理数据集选择变化
  const handleSelectDataset = (datasetId, checked) => {
    console.log(`选择变化: datasetId=${datasetId}, checked=${checked}`);
    
    if (checked) {
      // 添加到选择列表
      setSelectedDatasets([...selectedDatasets, datasetId]);
    } else {
      // 从选择列表移除
      setSelectedDatasets(selectedDatasets.filter(id => id !== datasetId));
    }
  };

  // 全选数据集
  const selectAllDatasets = () => {
    if (datasets.length === 0) return;
    
    const allDatasetIds = datasets.map(dataset => dataset.datasetId);
    setSelectedDatasets(allDatasetIds);
  };

  // 兑换选中的数据集
  const exchangeSelected = async () => {
    if (selectedDatasets.length === 0) {
      message.warning('请先选择要兑换的数据集');
      return;
    }
    
    setIsDownloading(true);
    const hide = message.loading('正在兑换数据集');
    
    try {
      // 获取选中数据集的sample_id字段
      const selectedItems = datasets.filter(dataset => selectedDatasets.includes(dataset.datasetId));
      const sampleIds = selectedItems.map(dataset => dataset.sampleId).join(',');
      
      console.log('兑换数据集，样本IDs:', sampleIds);
      
      const result = await reqExchangeSharedDataset({ sampleIds });
      
      if (result.code === 200) {
        hide();
        message.success('兑换成功！您可以在"已兑换的共享数据集"页面查看和下载');
        // 清除选择
        setSelectedDatasets([]);
      } else {
        hide();
        message.error(result.message || '兑换失败');
      }
    } catch (error) {
      hide();
      message.error('兑换失败，请联系管理员');
      console.error('兑换错误:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  // 显示图像预览
  const showImagePreview = (dataset) => {
    if (!dataset.thumbUrl) {
      message.warning('该数据集没有缩略图');
      return;
    }
    
    // 解析缩略图URL，用逗号分隔
    const imageUrls = dataset.thumbUrl.split(',').map(url => url.trim()).filter(url => url);
    
    if (imageUrls.length === 0) {
      message.warning('该数据集没有有效的缩略图');
      return;
    }
    
    console.log('原始图像路径:', imageUrls);
    
    // 构建图像预览数据
    const images = imageUrls.map((url, index) => {
      const imageUrl = `/wegismarkapi/dataset/thumbnail?imagePath=${encodeURIComponent(url)}`;
      console.log(`图像 ${index + 1} URL:`, imageUrl);
      
      return {
        uid: index,
        name: `缩略图 ${index + 1}`,
        status: 'done',
        url: imageUrl,
      };
    });
    
    setPreviewImages(images);
    setPreviewTitle(`${dataset.name} - 图像预览 (${images.length}张)`);
    setPreviewVisible(true);
  };

  return (
    <div className="tab-content-wrapper">
      <Card
        className="card"
        title={
          searchName && datasets.length > 0 
            ? `共享数据集列表 - "${searchName}"的搜索结果 (${datasets.length}个)` 
            : selectedDatasets.length > 0 
              ? `共享数据集列表 (已选${selectedDatasets.length}个)` 
              : '共享数据集列表'
        }
        headStyle={{ fontSize: 13 }}
        bodyStyle={{ padding: 0, height: '500px' }}
        extra={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Input
              placeholder="搜索数据集名称"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyPress={handleInputKeyPress}
              style={{ width: 200, marginRight: '8px' }}
              prefix={<SearchOutlined />}
              allowClear
              onPressEnter={handleSearch}
              disabled={isSearching}
            />
            <Button 
              type="primary" 
              onClick={handleSearch}
              loading={isSearching}
              style={{ marginRight: '8px' }}
            >
              搜索
            </Button>
            {searchName && (
              <Button 
                onClick={handleClearSearch}
                style={{ marginRight: '8px' }}
              >
                清除
              </Button>
            )}
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              onClick={exchangeSelected}
              disabled={selectedDatasets.length === 0 || isDownloading}
              loading={isDownloading}
              style={{ marginRight: '8px' }}
            >
              兑换COCO数据集
            </Button>
            {selectedDatasets.length === 0 ? (
              <Button 
                onClick={selectAllDatasets}
                style={{ marginRight: '8px' }}
              >
                全选
              </Button>
            ) : (
              <Button 
                onClick={() => setSelectedDatasets([])}
                style={{ marginRight: '8px' }}
              >
                清除选择
              </Button>
            )}
          </div>
        }
      >
        <div style={{ height: '100%', overflowY: 'auto', padding: '10px' }}>
          {isSearching ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>正在搜索...</div>
          ) : datasets && datasets.length > 0 ? (
            datasets.map((dataset) => (
              <div
                className="sample"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '8px',
                  cursor: 'pointer',
                  backgroundColor: selectedDatasets.includes(dataset.datasetId) ? '#f0f7ff' : 'transparent'
                }}
                key={dataset.datasetId}
                onClick={() => {
                  const isSelected = selectedDatasets.includes(dataset.datasetId);
                  handleSelectDataset(dataset.datasetId, !isSelected);
                }}
              >
                <Checkbox 
                  checked={selectedDatasets.includes(dataset.datasetId)}
                  style={{ marginRight: '8px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  onChange={(e) => {
                    handleSelectDataset(dataset.datasetId, e.target.checked);
                    e.stopPropagation();
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div>
                    {dataset.name}
                    <span style={{ marginLeft: '8px', color: '#888' }}>
                      (包含 {dataset.num || 0} 个样本)
                    </span>
                    <span style={{ marginLeft: '8px', color: '#ff6b35', fontWeight: 'bold' }}>
                      需要积分: {dataset.goal || 0}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                    {dataset.setDess}
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <Tag color="#2db7f5">{dataset.taskType || '未知类型'}</Tag>
                    {dataset.sorts && dataset.sorts.split(',').map((sort, index) => (
                      <Tag key={index} color="#87d068">{sort}</Tag>
                    ))}
                    <Tag color="#f50" style={{ marginLeft: '4px' }}>
                      {dataset.goal || 0} 积分
                    </Tag>
                  </div>
                </div>
                <div style={{ marginLeft: '8px' }}>
                  <Button
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      showImagePreview(dataset);
                    }}
                    disabled={!dataset.thumbUrl}
                    title="图像预览"
                  >
                    图像预览
                  </Button>
                </div>
              </div>
            ))
          ) : searchName ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              未找到与"{searchName}"相关的数据集
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              暂无数据
            </div>
          )}
        </div>
      </Card>
      
      {/* 图像预览Modal */}
      <Modal
        title={previewTitle}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={800}
        centered
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
          {previewImages.map((image, index) => (
            <div key={index} style={{ textAlign: 'center' }}>
              <Image
                width={200}
                height={150}
                src={image.url}
                alt={image.name}
                style={{ objectFit: 'cover', border: '1px solid #d9d9d9', borderRadius: '6px' }}
                fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvuWDj+WKoOi9veWksei0pTwvdGV4dD4KPC9zdmc+"
                preview={{
                  mask: <div style={{ background: 'rgba(0,0,0,0.5)', color: 'white', padding: '4px 8px', borderRadius: '4px' }}>预览</div>
                }}
                onError={(e) => {
                  console.error('图像加载失败:', image.url);
                  console.error('错误详情:', e);
                }}
                onLoad={() => {
                  console.log('图像加载成功:', image.url);
                }}
              />
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                {image.name}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
} 