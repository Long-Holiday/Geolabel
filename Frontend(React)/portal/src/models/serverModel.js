import { reqServiceList, reqServiceListBySetName } from '@/services/serviceManage/api';
import { message } from 'antd';
import { useState, useCallback, useEffect } from 'react';

export default function useServerModel() {
  const [serverList, setServiceList] = useState([]);
  const [serverListBySetName, setServerListBySetName] = useState({});
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasLoadedBySetName, setHasLoadedBySetName] = useState(false);
  
  const getServerList = useCallback(async () => {
    // 如果已经加载过数据且数据不为空，则不重复加载
    if (hasLoaded && serverList.length > 0) {
      return serverList;
    }
    
    if (loading) return; // 防止并发请求
    
    setLoading(true);
    try {
      let result = await reqServiceList();
      //用户列表
      if (result.code===200) {
        setServiceList(result.data);
        setHasLoaded(true);
      }
    } catch (error) {
      message.error('获取服务列表失败！');
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, [hasLoaded, serverList.length, loading]);
  
  const getServerListBySetName = useCallback(async () => {
    // 如果已经加载过数据且数据不为空，则不重复加载
    if (hasLoadedBySetName && Object.keys(serverListBySetName).length > 0) {
      return serverListBySetName;
    }
    
    if (loading) return; // 防止并发请求
    
    setLoading(true);
    try {
      let result = await reqServiceListBySetName();
      if (result.code === 200) {
        setServerListBySetName(result.data);
        setHasLoadedBySetName(true);
      }
    } catch (error) {
      message.error('获取影像集分组服务列表失败！');
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, [hasLoadedBySetName, serverListBySetName, loading]);

  return {
    getServerList,
    serverList,
    getServerListBySetName,
    serverListBySetName,
    loading,
  };
}
