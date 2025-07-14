import { Drawer, Spin, Image, Alert } from 'antd';
import { useState, useEffect } from 'react';
import { reqGetServerThumbnail } from '@/services/serviceManage/api';
import '../css.css';

export default function MyDrawer(props) {
  const { visible, content, onClose } = props;
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 获取缩略图
  const fetchThumbnail = async (serverName) => {
    if (!serverName) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await reqGetServerThumbnail(serverName);
      
      if (response && response.size > 0) {
        // 创建blob URL
        const blob = new Blob([response], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        setThumbnailUrl(url);
      } else {
        setError('无法获取影像缩略图');
      }
    } catch (err) {
      console.error('获取缩略图失败:', err);
      setError('获取影像缩略图失败');
    } finally {
      setLoading(false);
    }
  };

  // 当抽屉打开且有服务名称时获取缩略图
  useEffect(() => {
    if (visible && content?.serName) {
      fetchThumbnail(content.serName);
    }
    
    // 清理函数：关闭抽屉时清理blob URL
    return () => {
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
        setThumbnailUrl(null);
      }
      setError(null);
    };
  }, [visible, content?.serName]);

  return (
    <Drawer title={content.serName} placement="right" onClose={onClose} open={visible} width={600}>
      <div style={{ padding: '20px 0' }}>
        {/* 影像缩略图部分 */}
        <div style={{ marginBottom: '20px' }}>
          <h3 className="section-title">影像缩略图</h3>
          <div className="thumbnail-container">
            {loading && (
              <div className="thumbnail-loading">
                <Spin size="large" />
                <p>正在加载影像缩略图...</p>
              </div>
            )}
            
            {error && !loading && (
              <Alert
                message="缩略图加载失败"
                description={error}
                type="warning"
                showIcon
                style={{ width: '100%' }}
              />
            )}
            
            {thumbnailUrl && !loading && !error && (
              <Image
                src={thumbnailUrl}
                alt="影像缩略图"
                className="thumbnail-image"
                placeholder={
                  <div className="thumbnail-loading">
                    <Spin size="large" />
                  </div>
                }
                fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
              />
            )}
          </div>
        </div>

        {/* 服务信息部分 */}
        <div>
          <h3 className="section-title">服务信息</h3>
          <p style={{ fontSize: '16px', marginBottom: '15px' }}>服务描述：{content.serDesc}</p>
          <p style={{ fontSize: '16px', marginBottom: '15px' }}>发布人：{content.publisher}</p>
          <p style={{ fontSize: '16px', marginBottom: '15px' }}>地图年份：{content.serYear}</p>
          <p style={{ fontSize: '16px', marginBottom: '15px' }}>发布时间：{content.publishTime}</p>
          <p style={{ fontSize: '16px', marginBottom: '15px' }}>发布地址：{content.publishUrl}</p>
        </div>
      </div>
    </Drawer>
  );
}
