import { useRef, useEffect } from 'react';
import { notification, Select as AntdSelect } from 'antd';
import { Map, View } from 'ol';
import { transform } from 'ol/proj';
import XYZ from 'ol/source/XYZ';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource, OSM } from 'ol/source';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import ScaleLine from 'ol/control/ScaleLine';
import LayerSwitcher from 'ol-layerswitcher';
import 'ol-layerswitcher/dist/ol-layerswitcher.css';
import 'ol/ol.css'; //引入css样式才能起作用，比如tooltips等样式
import '../style.less';
import { InfoCircleOutlined } from '@ant-design/icons';

export default function BasicMap(props) {
  const { setMap } = props;
  const mapRef = useRef(null);
  // const { setMap } = props;
  const openNotification = (placement) => {
    notification.open({
      message: '温馨提示',
      description: '服务瓦片可能加载较慢，请耐心等待!',
      placement,
      icon: <InfoCircleOutlined style={{ color: '#108ee9' }} />,
    });
  };
  const initMap = () => {
    const GDVectorLayer = new TileLayer({
      title: '高德矢量图',
      source: new XYZ({
        url: 'https://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
      }),
      wrapX: false,
      visible: false, // 默认不显示
    });
    GDVectorLayer.set('typeid', 'base');
    
    const GDRSLayer = new TileLayer({
      title: '高德影像图',
      source: new XYZ({
        url: 'https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
      }),
      wrapX: false,
      visible: false, // 默认不显示
    });
    GDRSLayer.set('typeid', 'base');
    
    const tianDiLabelLayer = new TileLayer({
      title: '注记图层',
      source: new XYZ({
        url: 'http://t4.tianditu.com/DataServer?T=cva_w&tk=b790d37d46c223e490b8c7ebf70e2dcf&x={x}&y={y}&l={z}',
      }),
      wrapX: false,
      visible: false, // 默认不显示
    });
    tianDiLabelLayer.set('typeid', 'base');
    const tianDiRSLayer = new TileLayer({
      title: '天地图影像图',
      source: new XYZ({
        url: 'http://t0.tianditu.com/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=2ab0481b80f9e234df6fa67b414e7500',
      }),
    });
    tianDiRSLayer.set('typeid', 'base'); // 标记为基础图层
    
    const OSMLayer = new TileLayer({
      title: 'OSM资源图',
      source: new OSM({
        url: "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
        // url: "https://tile-b.openstreetmap.fr/hot/{z}/{x}/{y}.png",
      }),
    });
    OSMLayer.set('typeid', 'base'); // 标记为基础图层
    const vectorL = new VectorLayer({
      source: new VectorSource(),
      style: new Style({
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.2)',
        }),
        stroke: new Stroke({
          color: '#ffcc33',
          width: 2,
        }),
        image: new CircleStyle({
          radius: 7,
          fill: new Fill({
            color: '#ffcc33',
          }),
        }),
      }),
    });
    let map = new Map({
      view: new View({
        center: transform([114.298572, 30.584355], 'EPSG:4326', 'EPSG:3857'),
        zoom: 6,
        //最小级别
        minZoom: 2,
        //最大级别
        maxZoom: 20,
      }),
      // 包含所有基础图层，用户可以通过图层切换器选择
      layers: [tianDiRSLayer, OSMLayer, GDVectorLayer, GDRSLayer, tianDiLabelLayer, vectorL],
      target: 'map-container',
    });
    //比例尺控件
    const scaleLineControl = new ScaleLine({
      //设置度量单位为米
      units: 'metric',
      className: 'ol-scale-line',
    });

    const layerSwitcher = new LayerSwitcher({
      tipLabel: '图层控制', // 改为中文
      groupSelectStyle: 'children', // 添加分组选择样式
      activationMode: 'click', // 点击激活
      startActive: false, // 默认收起
      // 过滤函数，隐藏不需要在图层切换器中显示的图层
      layerFilter: function(layer) {
        // 如果图层设置了 displayInLayerSwitcher 为 false，则不显示
        if (layer.get('displayInLayerSwitcher') === false) {
          return false;
        }
        // 如果是模型作用范围图层，也不显示
        if (layer.get('typeid') === 'modelScope') {
          return false;
        }
        return true;
      }
    });
    map.addControl(layerSwitcher);
    map.addControl(scaleLineControl);
    setMap(map);
  };

  useEffect(() => {
    openNotification('topLeft');
    initMap();
  }, [mapRef]);
  return <div id="map-container" ref={mapRef} className="map-container" />;
}

//#region
/* new TileLayer({
            title: '天地图矢量图',
            source: new XYZ({
              url: 'http://t0.tianditu.com/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=2ab0481b80f9e234df6fa67b414e7500',
              wrapX: false,
            }),
          }), */
/* new TileLayer({
            title: '地形图',
            source: new XYZ({
              url: 'http://t0.tianditu.com/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=2ab0481b80f9e234df6fa67b414e7500',
            }),
          }), */
/* new TileLayer({
            title: '地形图',
            source: new XYZ({
              url: 'http://t0.tianditu.com/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=9f99f609d4634751979f7add06109a22',
            }),
          }), */
/* new TileLayer({
            title: '谷歌影像图',
            source: new XYZ({
              url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
            }),
          }), */
//#endregion
