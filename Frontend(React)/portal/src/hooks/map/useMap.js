import { message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { reqGetCategoryList } from '@/services/category/api';
import { reqGetGeoServerInfo } from '@/services/serviceManage/api';
import { reqStartMark } from '@/services/taskManage/api';
import { Decrypt } from '@/utils/utils';
import { transform, toLonLat } from 'ol/proj';
import Image from 'ol/layer/Image';
import ImageWMS from 'ol/source/ImageWMS';
import { boundingExtent } from 'ol/extent';
import { TileWMS } from 'ol/source';
import { Tile } from 'ol/layer';

// 地图挂载与服务定位
function useMap() {
  const mapRef = useRef(null);
  const [typeList, setTypeList] = useState({});
  const [taskInfo, setTaskInfo] = useState({ data: [{ taskname: '无' }] });
  const [markGeoJsonArr, setMarkGeoJsonArr] = useState([]);
  const [mapExtent, setMapExtent] = useState(null);
  const setMap = (map) => {
    mapRef.current = map;
  };
  
  // 添加刷新标注数据的函数
  const refreshMarkGeoJsonArr = async () => {
    try {
      let TASKID = window.sessionStorage.getItem('taskId');
      let taskId = Decrypt(TASKID);
      let taskResult = await reqStartMark({ taskid: taskId });
      if (taskResult && taskResult.markGeoJsonArr) {
        setMarkGeoJsonArr(taskResult.markGeoJsonArr);
        console.log('标注数据已刷新');
        return true;
      }
    } catch (error) {
      console.error('刷新标注数据失败:', error);
      return false;
    }
  };
  // useEffect(() => {
  //   let TASKID = window.sessionStorage.getItem('taskId');
  //   let taskId = Decrypt(TASKID);
  //   const interval = setInterval(async () => {
  //     try {
  //       let taskResult = await reqStartMark(taskId);
  //       if (taskResult.markGeoJsonArr != markGeoJsonArr) {
  //         console.log(taskResult.markGeoJsonArr == markGeoJsonArr);
  //         console.log(markGeoJsonArr, '当前数据');
  //         console.log('重新渲染');
  //         setMarkGeoJsonArr(taskResult.markGeoJsonArr);
  //       }
  //     } catch (error) {
  //       console.error('Error fetching data:', error);
  //     }
  //   }, 5000); // 每5秒发送一次请求
  //   return () => clearInterval(interval);
  // }, [markGeoJsonArr]);

  useEffect(async () => {
    // 定义标注底图,范围
    let mapserver, mapExtent, markGeoJson, baseLayer;
    let zuoshangExtent = [];
    let youxiaExtent = [];
    //EPSG:4326 对应的tif服务范围
    let map4326Extent;
    let zuoshang4326Extent = [];
    let youxia4326Extent = [];

    let is3857 = false;
    // 获取路径的参数信息
    let TASKID = window.sessionStorage.getItem('taskId');
    let taskId = Decrypt(TASKID);
    const hide = message.loading('正在获取数据', 0);
    try {
      let typeResult = await reqGetCategoryList();
      setTypeList(typeResult);
      let taskResult = await reqStartMark({taskid:taskId});
      setTaskInfo(taskResult);
      mapserver = taskResult.data[0].mapserver;
      // markGeoJson = taskResult.markGeoJson;
      setMarkGeoJsonArr(taskResult.markGeoJsonArr);
      let geoResult = await reqGetGeoServerInfo(mapserver);
      if (geoResult) {
        setMapExtent(geoResult.coverage.nativeBoundingBox);
        mapExtent = geoResult.coverage.nativeBoundingBox;
        map4326Extent=geoResult.coverage.latLonBoundingBox;
        if (geoResult.coverage.srs.includes('3857')) {
          console.log('坐标3857');
          is3857 = true;
        }
      }
      hide();
    } catch (error) {
      message.error('获取数据失败,请重试！');
      hide();
    }
    if (mapserver) {
      try {
        /*  const wmsSource = new ImageWMS({
          ratio: 1,
          // url: 'http://8.140.162.250:8080/geoserver/test/wms',
          url: 'http://localhost:8080/geoserver/LUU/wms',
          //crossOrigin: 'anonymous', //跨域声明
          params: {
            // request: 'GetMap',
            FORMAT: 'image/png',
            VERSION: '1.1.1',
            LAYERS: `LUU:${mapserver}`,
            exceptions: 'application/vnd.ogc.se_inimage',
            SERVICE: 'WMS',
            tile: true,
          },
        });
        baseLayer = new Image({
          title: '任务切片影像',
          source: wmsSource,
        }); */
        const wmsSource = new TileWMS({
          ratio: 1,
          // url: 'http://8.140.162.250:8080/geoserver/test/wms',
          url: 'http://localhost:8081/geoserver/LUU/wms',
          //crossOrigin: 'anonymous', //跨域声明
          params: {
            FORMAT: 'image/png',
            VERSION: '1.1.1',
            LAYERS: `LUU:${mapserver}`,
            exceptions: 'application/vnd.ogc.se_inimage',
            SERVICE: 'WMS',
            // VERSION: '1.1.1',
            // REQUEST: 'GetMap',
            // FORMAT: 'image/jpeg',
            // TRANSPARENT: true,
            // STYLES: '',
            // LAYERS: 'LUU:LE71490462003151ASN00_B1',
            // exceptions: 'application/vnd.ogc.se_inimage',
            // SRS: 'EPSG:32642',
            // WIDTH: '769',
            // HEIGHT: '690',
            // BBOX: '606196.665750958,2133989.3987471918,840816.2215926012,2344481.8929383196',
          },
        });
        // 使用tile请求更快
        baseLayer = new Tile({
          title: '任务切片影像',
          source: wmsSource,
        });
        // wmsSource.on('tileloadend', (event) => {
        //   console.log('抓取的图片', event);
        // });
        // 获取服务的范围
        const { maxx, maxy, minx, miny } = mapExtent;
        // 分割数组，注意 splice 改变原数组！
        zuoshangExtent = [Math.abs(minx), Math.abs(maxy)];
        youxiaExtent = [Math.abs(maxx), Math.abs(miny)];
        zuoshang4326Extent=[Math.abs(map4326Extent.minx), Math.abs(map4326Extent.maxy)];
        youxia4326Extent=[Math.abs(map4326Extent.maxx), Math.abs(map4326Extent.miny)];
      } catch (error) {
        message.error('geoserver后台异常，请联系管理员！');
        console.log(error, 'error');
      }
    }
    // 地图定位到服务的范围
    if (baseLayer) {
      mapRef.current.addLayer(baseLayer);
      let displayRange;
      let view = mapRef.current.getView();
/*      if (is3857) {
        displayRange = boundingExtent([zuoshangExtent, youxiaExtent]);
        console.log(displayRange, '3857坐标');
      } else {
         转换有问题
        EPSG:4326转 EPSG:3857。数据存储在EPSG:4326中，显示在EPSG:3857中
        let zuoshang = transform(zuoshangExtent, 'EPSG:4326', 'EPSG:3857');
        let youxia = transform(youxiaExtent, 'EPSG:4326', 'EPSG:3857');
        displayRange = boundingExtent([zuo, youxia]);
        // displayRange = boundingExtent([zuoshang4326Extent, youxia4326Extent]);
      }*/
      displayRange = boundingExtent([zuoshangExtent, youxiaExtent]);
      view.fit(displayRange, {
        maxZoom: 22,
        duration: 600,
        callback: () => {
          view.animate({ zoom: view.getZoom() - 1 });
        },
      });
    }
  }, []);
  return { typeList, taskInfo, setMap, mapRef, markGeoJsonArr, mapExtent, refreshMarkGeoJsonArr };
}

export default useMap;
