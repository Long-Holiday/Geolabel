import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Button, Form, Input, message, Popconfirm, Tag, Slider } from 'antd';
import { reqSaveService, reqExportService, reqAuditTask, reqAssistFunction, reqUqdateLabel,
  reqGetModelList,reqInferenceFunction} from '@/services/map/api';
import { reqStartMark } from '@/services/taskManage/api';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Fill, Stroke, Style } from 'ol/style';
import { Circle as CircleStyle } from 'ol/style';
import 'ol-layerswitcher/dist/ol-layerswitcher.css';
import 'ol/ol.css'; //引入css样式才能起作用，比如tooltips等样式
import Draw, { createBox, createRegularPolygon } from 'ol/interaction/Draw';
import { GeoJSON } from 'ol/format';
import './style.less';
import {Modify, Select, Translate} from 'ol/interaction';
import { CheckOutlined, CloseOutlined, DeleteOutlined, RollbackOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import Uploader from './Uploader';
import { Redirect, Access, useAccess, history, useModel } from 'umi';
import { Decrypt } from '@/utils/utils';
import BasicMap from './components/basicMap';
import useMap from '@/hooks/map/useMap';
import CollectionCreateForm from '@/components/CollectionCreateForm';
import { Collection } from 'ol';
import Polygon from 'ol/geom/Polygon';

// 创建可旋转矩形的几何函数
const createRotatableRectangle = () => {
  return function (coordinates, geometry) {
    if (!coordinates || coordinates.length < 2) {
      return geometry;
    }

    const center = coordinates[0];
    const last = coordinates[coordinates.length - 1];
    const dx = last[0] - center[0];
    const dy = last[1] - center[1];

    // 计算拖拽距离
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 如果距离太小，返回一个小的默认矩形
    // if (distance < 10) {
    //   const defaultSize = 50;
    //   const corners = [
    //     [center[0] - defaultSize, center[1] - defaultSize],
    //     [center[0] + defaultSize, center[1] - defaultSize],
    //     [center[0] + defaultSize, center[1] + defaultSize],
    //     [center[0] - defaultSize, center[1] + defaultSize],
    //     [center[0] - defaultSize, center[1] - defaultSize]
    //   ];

    //   if (!geometry) {
    //     geometry = new Polygon([corners]);
    //   } else {
    //     geometry.setCoordinates([corners]);
    //   }
    //   return geometry;
    // }

    // 计算旋转角度（基于拖拽方向）
    const rotation = Math.atan2(dy, dx);

    // 动态计算矩形尺寸
    // 长边为拖拽距离，短边为长边的0.4倍（可调整比例）
    const length = distance;
    const width = distance*0.618;

    // 创建矩形的四个角点（相对于中心点，长边沿着拖拽方向）
    const halfLength = length/2;
    const halfWidth = width/2;

    const corners = [
      [-halfLength, -halfWidth],
      [halfLength, -halfWidth],
      [halfLength, halfWidth],
      [-halfLength, halfWidth],
      [-halfLength, -halfWidth] // 闭合多边形
    ];

    // 应用旋转变换
    const rotatedCorners = corners.map(([x, y]) => {
      const rotatedX = x * Math.cos(rotation) - y * Math.sin(rotation);
      const rotatedY = x * Math.sin(rotation) + y * Math.cos(rotation);
      return [center[0] + rotatedX, center[1] + rotatedY];
    });

    if (!geometry) {
      geometry = new Polygon([rotatedCorners]);
    } else {
      geometry.setCoordinates([rotatedCorners]);
    }

    return geometry;
  };
};

export default function () {
  const shapeSelect = useRef();
  const layerSelect = useRef();
  const [showUploader, setShowUploader] = useState(false);
  const [showAuditLoader, setShowAuditLoader] = useState(false);
  const [markSource, setMarkSource] = useState(new VectorSource());
  const [modelContainerExpanded, setModelContainerExpanded] = useState(false);
  const [fillOpacity, setFillOpacity] = useState(0.2); // 默认不透明度为0.2
  const [toolbarState, setToolbarState] = useState({
    drawState: false,
    color: '',
    sourceKey: null,
    markSource: new VectorSource(),
    currentLayer: '',
  });
  const {
    initialState: {
      currentState: { currentUser },
    },
  } = useModel('@@initialState');
  //挂载地图并定位服务 hook
  const { typeList, taskInfo, setMap, mapRef, markGeoJsonArr, mapExtent, refreshMarkGeoJsonArr } = useMap();
  const access = useAccess(); // access 实例的成员: canAdmin, canUser
  let select, modify, translate, shapeDraw; // 将交互变量声明在组件顶层

  // 辅助函数：将颜色转换为指定透明度版本
  const getTransparentColor = useCallback((color, opacity = fillOpacity) => {
    if (!color) return `rgba(102, 153, 255, ${opacity})`;

    // 如果已经是rgba格式，替换透明度
    if (color.startsWith('rgba')) {
      return color.replace(/,\s*[\d.]+\)$/, `, ${opacity})`);
    }

    // 如果是hex格式，转换为rgba
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    // 如果是rgb格式，转换为rgba
    if (color.startsWith('rgb')) {
      return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
    }

    // 默认颜色
    return `rgba(102, 153, 255, ${opacity})`;
  }, [fillOpacity]);

  //修改标注显示部分的代码，将原来标注显示部分的代码由useEffect改为在generateMarkLayer函数中进行,根据用户角色进行判断，仅当用户为管理员时才进行渲染
  const generateMarkLayer = useMemo(() => {
    console.log('遍历已标注的的标注图层');
    // 如果是审核状态（status=0），则显示所有用户的标注;否则只显示自己的
    //修改点1，添加安全校验
    const userList = taskInfo?.data?.[0]?.status === 0
      ? taskInfo?.data?.[0]?.userArr ?? []  // 如果是审核状态，使用所有用户
      : taskInfo?.data?.[0]?.userArr?.filter(({ username }) => username === currentUser) ?? []; // 否则只显示当前用户

    const totalTypeIdArr = [];
    if (userList) {
      for (const { typeArr,username } of userList) {
        //修改点2，审核状态显示所有标注
        if(taskInfo?.data?.[0]?.status === 0){
          totalTypeIdArr.push(...typeArr);
          continue
        }
        totalTypeIdArr.push(...typeArr);
      }
    }

    // 添加背景图层到类型数组中（仅在非审核状态下为当前用户添加）
    if (taskInfo?.data?.[0]?.status !== 0) {
      totalTypeIdArr.push({
        typeId: 0,
        typeName: '背景',
        typeColor: '#ff0000' // 红色表示要消除的区域
      });
    }

    let vectorLayerArr = [];
    if (totalTypeIdArr.length) {
      vectorLayerArr = totalTypeIdArr.map(({ typeColor, typeName, typeId }) => {
        const typeSource = new VectorSource({
          format:new GeoJSON(),
          projection:"EPSG:3857"
        });
        typeSource?.set('typeid', typeId);
        for (const item of markGeoJsonArr) {
          if (typeId == item.typeId) {
            const features = new GeoJSON().readFeatures(item.markGeoJson);
            features.forEach(feature => {
              feature.set('markId', item.markId);
              typeSource.addFeature(feature);
            });
          }
        }

        // Create a style function that handles both Point and Polygon geometries
        const styleFunction = (feature) => {
          const geometry = feature.getGeometry();
          const geometryType = geometry.getType();

          if (geometryType === 'Point') {
            // Style for Point features
            return new Style({
              image: new CircleStyle({
                radius: 6, // 设置点的半径为 6 像素
                fill: new Fill({
                  color: getTransparentColor('#ffffff'),
                }),
                stroke: new Stroke({
                  color: typeColor,
                  width: 3,
                }),
              }),
            });
          } else {
            // Style for Polygon features
            // 背景图层使用特殊样式（斜线填充）
            if (typeId === 0) {
              return new Style({
                fill: new Fill({
                  color: getTransparentColor(typeColor, 0.3), // 背景图层透明度稍低
                }),
                stroke: new Stroke({
                  color: typeColor,
                  width: 3,
                  lineDash: [5, 5], // 虚线边框
                }),
              });
            } else {
              return new Style({
                fill: new Fill({
                  color: getTransparentColor(typeColor),
                }),
                stroke: new Stroke({
                  color: typeColor,
                  width: 3,
                }),
              });
            }
          }
        };

        const vectorLayer = new VectorLayer({
          title: typeName,
          source: typeSource,
          style: styleFunction,
        });
        vectorLayer.set('typeid', typeId);
        vectorLayer.setZIndex(99);
        return vectorLayer;
      });
    }

    // 添加"模型作用范围"图层（不在图层切换器中显示）
    const modelScopeSource = new VectorSource();
    const modelScopeLayer = new VectorLayer({
      title: '模型作用范围',
      source: modelScopeSource,
      style: new Style({
        fill: new Fill({
          color: getTransparentColor('#ffcc33'),
        }),
        stroke: new Stroke({
          color: '#ffcc33', // 使用特定颜色区分
          width: 3,
        }),
      }),
    });
    modelScopeLayer.set('typeid', 'modelScope');
    modelScopeLayer.set('displayInLayerSwitcher', false); // 设置不在图层切换器中显示
    modelScopeLayer.setZIndex(99);
    vectorLayerArr.push(modelScopeLayer);

    return vectorLayerArr;
  }, [markGeoJsonArr, taskInfo, currentUser, mapRef, getTransparentColor]); // 依赖项包含任务状态和用户信息

  // 管理图层的添加和移除
  useEffect(() => {
    if (!mapRef.current || !generateMarkLayer.length) return;

    // 移除之前的标注图层（避免重复添加）
    const existingLayers = mapRef.current.getLayers().getArray().slice();
    existingLayers.forEach(layer => {
      if (layer.get('typeid') && layer.get('typeid') !== 'base') {
        mapRef.current.removeLayer(layer);
      }
    });

    // 添加新的标注图层
    generateMarkLayer.forEach(layer => {
      layer.setZIndex(99);
      mapRef.current.addLayer(layer);
      layer.setVisible(true);
      console.log('添加图层:', layer.get('title'), '类型ID:', layer.get('typeid'), '要素数量:', layer.getSource().getFeatures().length);
    });

    // 输出当前地图中的所有图层信息
    console.log('当前地图图层总数:', mapRef.current.getLayers().getLength());
    mapRef.current.getLayers().forEach((layer, index) => {
      console.log(`图层 ${index}:`, layer.get('title'), '可见性:', layer.getVisible(), '类型ID:', layer.get('typeid'));
    });

    // 数据刷新后，如果当前有选中的图层，需要更新toolbarState中的数据源
    if (toolbarState.sourceKey && toolbarState.sourceKey !== null) {
      const currentLayer = generateMarkLayer.find(layer => layer.get('typeid') == toolbarState.sourceKey);
      if (currentLayer) {
        console.log('数据刷新后更新工具栏状态，图层ID:', toolbarState.sourceKey);
        setToolbarState(prevState => ({
          ...prevState,
          markSource: currentLayer.getSource(),
          currentLayer: currentLayer,
        }));
      }
    }

    return () => {
      // 清理函数：组件卸载时移除图层
      if (mapRef.current) {
        generateMarkLayer.forEach(layer => {
          mapRef.current.removeLayer(layer);
        });
      }
    };
  }, [generateMarkLayer, mapRef, toolbarState.sourceKey]); // 添加toolbarState.sourceKey到依赖项
  useEffect(async () => {
    // 当前选择的数据源
    const currentSelectSource = toolbarState.markSource;
    // 添加绘制效果

    // 清理之前的交互
    if (mapRef.current) {
      const interactions = mapRef.current.getInteractions().getArray().slice();
      interactions.forEach(interaction => {
        if (interaction instanceof Draw ||
            interaction instanceof Select ||
            interaction instanceof Modify ||
            interaction instanceof Translate) {
          mapRef.current.removeInteraction(interaction);
        }
      });
    }

    const addDrawInteraction = () => {
      let value = shapeSelect.current.value;
      let geometryFunction;
      let cursorStyle = 'crosshair'; // 默认十字光标

      switch (value) {
        // 矩形
        case 'Box':
          value = 'Circle';
          geometryFunction = createBox();
          cursorStyle = 'crosshair';
          break;
        // 可旋转矩形
        case 'RotatableRectangle':
          value = 'Circle';
          geometryFunction = createRotatableRectangle();
          cursorStyle = 'crosshair';
          break;
        // 多边形
        case 'Polygon':
          value = 'Polygon';
          cursorStyle = 'crosshair';
          break;
        case 'Point':  // 新增对 Point 类型的处理
          value = 'Point';
          cursorStyle = 'crosshair';
          break;
      }

      // 设置地图容器的光标样式
      if (mapRef.current) {
        const mapElement = mapRef.current.getTargetElement();
        if (mapElement) {
          // 创建自定义光标样式
          mapElement.style.cursor = cursorStyle;
          // 添加一个CSS类来标识当前处于绘制模式
          mapElement.classList.add('drawing-mode');
          mapElement.setAttribute('data-draw-type', shapeSelect.current.value);
        }
      }

// 定义绘制样式，与当前图层样式一致
      let drawStyle;

      if (value === 'Point') {
        drawStyle = new Style({
          image: new CircleStyle({
            radius: 6, // 设置点的半径为 6 像素
            fill: new Fill({
              color: getTransparentColor('#ffffff'), // 与图层填充一致
            }),
            stroke: new Stroke({
              color: toolbarState.color || '#6699ff', // 使用当前图层的颜色
              width: 3, // 与图层边框宽度一致
            }),
          }),
        });
      } else {
        // 为多边形和其他几何类型定义样式
        drawStyle = new Style({
          fill: new Fill({
            color: getTransparentColor(toolbarState.color), // 使用改进的颜色转换函数
          }),
          stroke: new Stroke({
            color: toolbarState.color || '#6699ff', // 使用当前图层的颜色
            width: 3, // 与图层边框宽度一致
          }),
        });
      }
      shapeDraw = new Draw({
        source: currentSelectSource,
        type: value,
        geometryFunction: geometryFunction,
        style: drawStyle // 将自定义样式应用到绘制交互
      });
      console.log('标注的数据源');
      console.log(currentSelectSource);

      shapeDraw.on('drawend', (event) => {
        // 获取绘制的矩形
        const geometry = event.feature.getGeometry();
        // 获取矩形的坐标
        const coordinates = geometry.getExtent();
        // 获取地图分辨率
        const resolution = mapRef.current.getView().getResolution();

        // 确保绘制完成后的要素保持正确的样式
        const feature = event.feature;
        const geometryType = feature.getGeometry().getType();

        if (geometryType === 'Point') {
          feature.setStyle(drawStyle); // 确保绘制完成后点保持自定义样式
        } else {
          // 为多边形等其他类型设置样式
          const featureStyle = new Style({
            fill: new Fill({
              color: getTransparentColor(toolbarState.color),
            }),
            stroke: new Stroke({
              color: toolbarState.color || '#6699ff',
              width: 3,
            }),
          });
          feature.setStyle(featureStyle);
        }
      });
      if (mapRef.current) {
        mapRef.current.addInteraction(shapeDraw);
      }
    };

    // 添加绘制的交互
    if (toolbarState.currentLayer) {
      select = new Select({
        layers: [toolbarState.currentLayer],
      });
      translate = new Translate({
        features: new Collection([toolbarState.currentLayer]),
      });
      mapRef.current?.addInteraction(translate);
      mapRef.current?.addInteraction(select);
    }

    if (currentSelectSource && currentSelectSource.getFeatures) {
      modify = new Modify({ source: currentSelectSource });
      //查看修改后的feature信息
      modify.on('modifyend', (event) => {
        // 获取绘制的矩形
        const feature = event.features;
        console.log("修改后的feature")
        console.log(feature)
        console.log(event)
        console.log(toolbarState.currentLayer)
      });
      //对绘制图形进行修改
      mapRef.current?.addInteraction(modify);
    }

    // 标注形状选择
    const onSelect = () => {
      if (shapeDraw && mapRef.current) {
        mapRef.current.removeInteraction(shapeDraw);
      }
      if (modify && mapRef.current) {
        mapRef.current.removeInteraction(modify);
      }

      if (shapeSelect.current.value != 'None') {
        addDrawInteraction();
        if (modify && mapRef.current) {
          mapRef.current.addInteraction(modify);
        }
      } else {
        // 恢复默认光标并清理CSS类
        if (mapRef.current) {
          const mapElement = mapRef.current.getTargetElement();
          if (mapElement) {
            mapElement.style.cursor = 'default';
            mapElement.classList.remove('drawing-mode');
            mapElement.removeAttribute('data-draw-type');
          }
        }
      }
    };
    if (shapeSelect.current) {
      shapeSelect.current.onchange = onSelect;
    }
    // 按下esc取消绘制
    document.onkeydown = (event) => {
      if (event.key == 'Escape') {
        shapeSelect.current.value = 'None';
        onSelect();
        // 恢复默认光标并清理CSS类
        if (mapRef.current) {
          const mapElement = mapRef.current.getTargetElement();
          if (mapElement) {
            mapElement.style.cursor = 'default';
            mapElement.classList.remove('drawing-mode');
            mapElement.removeAttribute('data-draw-type');
          }
        }
      }
    };
    // 选择编辑图层
    const onLayerSelect = () => {
      const key = layerSelect.current.value;
      if (key != 'None') {
        // 处理背景图层选择
        if (key == '0') {
          setToolbarState({
            color: '#ff0000', // 背景图层使用红色
            drawState: false,
            sourceKey: 0,
            markSource: currentSource(0),
            currentLayer: currentLayer(0),
          });
        } else {
          // 处理普通图层选择
          const type = typeList.data.filter((item) => {
            return item.typeId == key;
          });
          setToolbarState({
            color: type[0].typeColor,
            drawState: false,
            sourceKey: key,
            markSource: currentSource(key),
            currentLayer: currentLayer(key),
          });
        }
      } else {
        setToolbarState({
          color: null,
          drawState: true,
          sourceKey: null,
          markSource: new VectorSource(),
        });
        // mapRef.current.removeInteraction(modify);
      }
      if (shapeDraw && mapRef.current) {
        mapRef.current.removeInteraction(shapeDraw);
      }
      shapeSelect.current.value = 'None';
    };
    if (layerSelect.current) {
      layerSelect.current.onchange = onLayerSelect;
    }
    console.log(mapExtent, 'mapExtent');

    // 清理函数
    return () => {
      if (mapRef.current) {
        if (shapeDraw) mapRef.current.removeInteraction(shapeDraw);
        if (select) mapRef.current.removeInteraction(select);
        if (modify) mapRef.current.removeInteraction(modify);
        if (translate) mapRef.current.removeInteraction(translate);
      }
    };
  }, [markGeoJsonArr, toolbarState.markSource, toolbarState.currentLayer, mapExtent, getTransparentColor, fillOpacity]);

  let featuresList = []; //绘制的要素集合
  // 遍历生成不同目标图层
  // const generateMarkLayer = useMemo(() => {
  //   console.log('遍历已标注的的标注图层');
  //   // 收集所有标签信息，用于渲染其他用户标注的图层
  //   const currentUserTagList = taskInfo.data[0].userArr;
  //   const totalTypeIdArr = [];
  //   if (currentUserTagList) {
  //     for (const { typeArr,username } of currentUserTagList) {
  //       if (username===currentUser){
  //         totalTypeIdArr.push(...typeArr);
  //       }
  //     }
  //   }
  //   console.log(totalTypeIdArr, 'totalTypeIdArr');
  //   let vectorLayerArr = [];
  //   if (totalTypeIdArr.length) {
  //     console.log(totalTypeIdArr);
  //     //只对当前用户生成标注图形
  //     vectorLayerArr = totalTypeIdArr.map(({ typeColor, typeName, typeId }) => {
  //       const typeSource = new VectorSource({
  //           format:new GeoJSON(),
  //         projection:"EPSG:3de57"
  //       });
  //       typeSource?.set('typeid', typeId);
  //       for (const item of markGeoJsonArr) {
  //         if (typeId == item.typeId) {
  //           let existedFeatures = new GeoJSON().readFeatures(item.markGeoJson);
  //           let map = existedFeatures.map(existedFeaturesItem=>{
  //             existedFeaturesItem.set('markId', item.markId);
  //             return existedFeaturesItem;
  //           });
  //           typeSource.addFeatures(map);
  //         }
  //       }
  //       const vectorLayer = new VectorLayer({
  //         title: typeName,
  //         source: typeSource,
  //         style: new Style({
  //           //填充
  //           fill: new Fill({
  //             color: 'rgba(255, 255, 255, 0.2)',
  //           }),
  //           //边框
  //           stroke: new Stroke({
  //             color: typeColor,
  //             // color: '#6699ff',
  //             width: 3,
  //           }),
  //         }),
  //       });
  //       vectorLayer.set('typeid', typeId);
  //       return vectorLayer;
  //     });
  //   }
  //   /*// const vectorLayerArr = markGeoJsonArr.map(({ typecolor, typename, typeid, markGeoJson }) => {
  //   //   const typeSource = new VectorSource();
  //   //   typeSource?.set('typeid', typeid);
  //   //   typeSource.addFeatures(new GeoJSON().readFeatures(markGeoJson));
  //   //   const vectorLayer = new VectorLayer({
  //   //     title: typename,
  //   //     source: typeSource,
  //   //     style: new Style({
  //   //       //填充
  //   //       fill: new Fill({
  //   //         color: 'rgba(255, 255, 255, 0.2)',
  //   //       }),
  //   //       //边框
  //   //       stroke: new Stroke({
  //   //         color: typecolor,
  //   //         // color: '#6699ff',
  //   //         width: 3,
  //   //       }),
  //   //     }),
  //   //   });
  //   //   vectorLayer.set('typeid', typeid);
  //   //   return vectorLayer;
  //   // });
  //   //#region
  //   // if (typeList.data) {
  //   //   vectorLayerArr = typeList.data.map(({ typecolor, typename, typeid }) => {
  //   //     const typeSource = new VectorSource();
  //   //     typeSource?.set('typeid', typeid);
  //   //     for (const item of markGeoJsonArr) {
  //   //       if (typeid == item.typeid) {
  //   //         typeSource.addFeatures(new GeoJSON().readFeatures(item.markGeoJson));
  //   //       }
  //   //     }
  //   //     const vectorLayer = new VectorLayer({
  //   //       title: typename,
  //   //       source: typeSource,
  //   //       style: new Style({
  //   //         //填充
  //   //         fill: new Fill({
  //   //           color: 'rgba(255, 255, 255, 0.2)',
  //   //         }),
  //   //         //边框
  //   //         stroke: new Stroke({
  //   //           color: typecolor,
  //   //           // color: '#6699ff',
  //   //           width: 3,
  //   //         }),
  //   //       }),
  //   //     });
  //   //     vectorLayer.set('typeid', typeid);
  //   //     return vectorLayer;
  //   //   });
  //   // }
  //   //#endregion*/
  //   return vectorLayerArr;
  // }, [markGeoJsonArr, taskInfo]);
  // 获取当前标注的数据源
  const currentSource = useCallback(
    (typeid) => {
      for (const layer of generateMarkLayer) {
        if (layer.getSource().get('typeid') == typeid) {
          return layer.getSource();
        }
      }
    },
    [generateMarkLayer],
  );
  // 获取当前标注的图层
  const currentLayer = useCallback(
    (typeid) => {
      for (const layer of generateMarkLayer) {
        if (layer.get('typeid') == typeid) {
          //TODO
          return layer;
        }
      }
    },
    [generateMarkLayer],
  );
  // 回滚
  const undo = useCallback(() => {
    try {
      let features = toolbarState.currentLayer.getSource().getFeatures();
      let feature = features.pop();
      if (feature) {
        toolbarState.currentLayer.getSource().removeFeature(feature);
        featuresList.push(feature);
      }
    } catch (error) {
      message.warn('请选择图层');
    }
  }, [toolbarState.currentLayer]);
  // 恢复
  const recover = useCallback(() => {
    let feature;
    feature = featuresList.pop();
    if (feature) {
      toolbarState.currentLayer.getSource().addFeature(feature);
    }
  }, [toolbarState.currentLayer]);
  const getTaskId = useMemo(() => {
    let TASKID = window.sessionStorage.getItem('taskId');
    // let TASKID=taskInfo.data[0].taskname
    let taskId=Decrypt(TASKID)
    return taskId;
  }, []);
  const save = async () => {
    let taskId = getTaskId;
    const jsondataArr = [];

    for (const layer of generateMarkLayer) {
      const features = layer.getSource().getFeatures();
      const typeId = layer.getSource().get('typeid');
      console.log('Layer features:', features);

      if (features.length > 0) {
        // Add markId property to each feature for tracking
        features.forEach(feature => {
          if (!feature.get('markId')) {
            // Only set markId if it doesn't already exist
            feature.set('markId', null);
          }
        });

        // Use OpenLayers GeoJSON format to correctly generate standard GeoJSON for both Point and Polygon
        const format = new GeoJSON();
        const geoJson = format.writeFeatures(features);

        jsondataArr.push({
          geoJson,
          typeId
        });
      }
    }
      // 保存标注结果，传任务id和标注数据
      console.log('保存的数据', { id: Number(taskId), jsondataArr });
      try {
        const hide = message.loading('正在保存');
        console.log('Sending request to save data...');
        const currentUserId = taskInfo.data[0].userArr.filter(({ username }) => username == currentUser)[0].userid;
        const requestData = {
          userid: currentUserId,
          id: taskId,
          jsondataArr,
          typeArr: taskInfo.data[0].userArr.filter(({ username }) => username == currentUser)[0].typeArr,
          setAsSubmitter: true // 添加该字段表示将当前用户设为唯一执行者
        };
        console.log('Request data:', requestData);
        let result = await reqSaveService(requestData);
        console.log('Save response:', result);
        if (result && result.code === 200) {
          hide();
          message.success('保存成功！');
          // 保存成功后刷新标注数据以确保显示最新状态
          await refreshMarkGeoJsonArr();
        } else {
          message.error('保存失败！');
        }
      } catch (error) {
        console.error('Save error:', error);
        message.error('后台异常，请稍后重试！');
      }
  };
  // 删除要素
  const deleteFeature = useCallback(() => {
    let selectFeasuresList = select.getFeatures().getArray();
    if (selectFeasuresList.length > 0) {
      try {
        selectFeasuresList.forEach((item) => {
          // 直接从数据源中移除要素
          toolbarState.currentLayer.getSource().removeFeature(item);
        });
        message.success('已删除选中的标注');
      } catch (error) {
        message.error('删除操作失败！');
      }
    } else {
      message.warn('未标注或未选中图形！');
    }
    select.getFeatures().clear();
  }, [select, toolbarState.currentLayer]);
  // 导出获得数据并发送请求
  const onExport = async (JsonObj) => {
    const hide = message.loading('正在导出样本数据');
    let data = { jsonData: JsonObj };
    try {
      reqExportService(data).then((res) => {
        hide();
        let link = document.createElement('a');
        link.style.display = 'none';
        link.target = '_blank';
        link.href = URL.createObjectURL(res);
        link.download = '标注数据.zip';
        document.body.appendChild(link);
        link.click();
        URL.revokeObjectURL(link.href);
        document.body.removeChild(link);
      });
    } catch (e) {
      hide();
      message.error('导出失败，请稍后重试！');
      return false;
    }
    return true;
  };
  const handleGetShp = (shp) => {
    //直接转化成对象，加入地图，如下
    const importJson = JSON.parse(shp);
    setMarkSource(markSource.addFeatures(new GeoJSON().readFeatures(importJson)));
  };
  // 导出
  const exportFile = useCallback(() => {
    let features = toolbarState.currentLayer.getSource().getFeatures();

    // Use OpenLayers GeoJSON format to correctly handle Point and Polygon geometries
    const format = new GeoJSON();
    let jsonobj = format.writeFeatures(features);

    if (JSON.parse(jsonobj).features.length != 0) {
      onExport(JSON.parse(jsonobj));
    } else {
      message.warn('不能导出空的数据');
    }
  }, [toolbarState.currentLayer]);
  // 不通过确认
  const confirm = useCallback(() => {
    console.log(11);
  }, []);
  // 通过审核
  const passAudit = useCallback(async () => {
    let taskid = getTaskId;
    try {
      const hide = message.loading('正在提交');
      const result = await reqAuditTask({ taskId: taskid, status: 1 });
      if (result.code == 200) {
        hide();
        message.success('提交成功！');
        history.push('/taskmanage');
      } else {
        message.error('提交失败！');
      }
    } catch (error) {
      message.error('后台异常，请稍后重试！');
    }
  }, []);
  const onCreate = useCallback(async ({ auditFeedback }) => {
    let taskid = getTaskId;
    try {
      const hide = message.loading('正在提交');
      const result = await reqAuditTask({ taskId: taskid, status: 2, auditFeedback });
      if (result.code == 200) {
        hide();
        message.success('提交成功！');
        history.push('/taskmanage');
      } else {
        message.error('提交失败！');
      }
      setShowAuditLoader(false);
    } catch (error) {
      message.error('后台异常，请稍后重试！');
      setShowAuditLoader(false);
    }
  }, []);
  const onCancel = useCallback(() => {
    setShowAuditLoader(false);
  }, []);

  // 机器学习辅助生成按键（模型及参数选择）——区分目标识别和地物分类
  const [assistInput, setAssistInput] = useState('');
  const [modelName, setModelName] = useState(''); // 新增模型名称状态
  const [assistFunction, setAssistFunction] = useState('');
  const [param1, setParam1] = useState('');
  const [param2, setParam2] = useState('');
  const [param3, setParam3] = useState('');
  const [param4, setParam4] = useState('');
  const [categoryMapping, setCategoryMapping] = useState(JSON.stringify({0: '类别一ID', 1: '类别二ID', 2: '类别三ID'}, null, 2));
  const [modelResults, setModelResults] = useState({}); // 新增用于存储后端返回的字典
// 定义获取 user_id 的函数
  const getUserId = () => {
    const user = taskInfo?.data[0]?.userArr?.find(({ username }) => username === currentUser);
    return user?.userid;
  };

// 定义路径映射
  const getModelPathByTaskType = (taskType) => {
    const userId = getUserId();
    const pathMap = {
      '目标检测': '/home/change/labelcode/labelMark/trained_models/' + userId +'/detection_results',
      '地物分类': '/home/change/labelcode/labelMark/trained_models/' + userId + '/segmentation_results',
    };
    return pathMap[taskType] || '/models/default';
  };

// 状态定义（模型推理组件）
  const [modelList, setModelList] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');

  // 获取模型列表
useEffect(() => {
  const fetchModelList = async () => {
    const taskType = taskInfo?.data[0]?.type;
    if (!taskType) {
      console.warn('任务类型未定义，无法获取模型列表');
      return;
    }

    // const modelPath = getModelPathByTaskType(taskType);
    // console.log('Fetching models from path:', modelPath);
    const userId = getUserId(); // 获取当前用户ID

    try {
      // const response = await reqGetModelList({ path: modelPath });
      const response = await reqGetModelList({
        user_id: userId, // 添加user_id参数
        task_type: taskType
      });
      if (response.code === 200) {
        // 如果返回的是字典，直接设置到modelResults中
        if (typeof response.data === 'object' && !Array.isArray(response.data)) {
          setModelResults(response.data);
          // 同时提取字典的键作为模型列表
          setModelList(Object.keys(response.data));
        } else {
          // 保持原有逻辑处理数组类型返回
          setModelList(response.data);
          // 将数组转换为字典格式，值为空字符串
          const dict = response.data.reduce((acc, model) => {
            acc[model] = '';
            return acc;
          }, {});
          setModelResults(dict);
        }
      } else {
        // message.error('获取模型列表失败');
      }
    } catch (error) {
      // message.error('获取模型列表失败：' + error.message);
    }
  };
  fetchModelList();
}, [taskInfo]);
// // 获取模型列表
//   useEffect(() => {
//     const fetchModelList = async () => {
//       const taskType = taskInfo?.data[0]?.type;
//       if (!taskType) {
//         console.warn('任务类型未定义，无法获取模型列表');
//         return;
//       }

//       const modelPath = getModelPathByTaskType(taskType);
//       console.log('Fetching models from path:', modelPath);

//       try {
//         const response = await reqGetModelList({ path: modelPath });
//         if (response.code === 200) {
//           setModelList(response.data);
//         } else {
//           message.error('获取模型列表失败');
//         }
//       } catch (error) {
//         message.error('获取模型列表失败：' + error.message);
//       }
//     };
//     fetchModelList();
//   }, [taskInfo]);

// 辅助功能（模型训练）
  const handleAssistClick = async () => {
    let taskId = getTaskId;
    const taskType = taskInfo?.data[0].type;

    if (!assistFunction || assistFunction === 'none') {
      message.error('请先选择一个模型！');
      return;
    }

    const userId = getUserId();
    if (!userId) {
      message.error('无法获取用户 ID，请检查用户信息');
      return;
    }

    let parameters = {};
    if (taskType === '目标检测') {
      parameters = {
        param1: param1,
        param2: param2,
        param3: param3,
        param4: param4,
        categoryMapping: categoryMapping,
      };
    } else {
      parameters = {
        param1: param1,
        param2: param2,
        param3: param3,
        param4: param4,
        categoryMapping: categoryMapping,
      };
    }

    // 获取"模型作用范围"图层的多边形坐标
    const modelScopeLayer = generateMarkLayer.find(layer => layer.get('typeid') === 'modelScope');
    const modelScopeFeatures = modelScopeLayer.getSource().getFeatures();
    const modelScopeCoordinates = modelScopeFeatures.map(feature => feature.getGeometry().getCoordinates());
    parameters.modelScope = modelScopeCoordinates.length > 0 ? modelScopeCoordinates : [];

    try {
      //先保存当前页面的样本到数据库中
      await save();

      const hide = message.loading('正在调用辅助功能...');
      const result = await reqAssistFunction({
        taskid: taskId,
        task_type: taskType,
        user_id: userId,
        functionName: assistFunction,
        assistInput: assistInput || '150',
        modelName: modelName, // 新增模型名称参数
        parameters,
      });
      hide();
      if (result.code === 200) {
        message.success(result.message);
        setModelResults(result.data || {}); // 存储后端返回的字典数据
        // 刷新标注数据而不是整个页面
        await refreshMarkGeoJsonArr();
      } else {
        message.error(result.message || '调用辅助功能失败');
      }
    } catch (error) {
      message.error('调用辅助功能失败：' + error.message);
    }
  };


  // 提取目标功能（XGBoost固定参数）
  const handleExtractTarget = async () => {
    let taskId = getTaskId;
    const taskType = taskInfo?.data[0].type;
    const userId = getUserId();

    if (!userId) {
      message.error('无法获取用户 ID，请检查用户信息');
      return;
    }

    // 固定参数设置
    const fixedParameters = {
      param1: '800',
      param2: '800',
      param3: '10',
      param4: '1',
      categoryMapping: JSON.stringify({}),
    };

    // 获取"模型作用范围"图层的多边形坐标
    const modelScopeLayer = generateMarkLayer.find(layer => layer.get('typeid') === 'modelScope');
    const modelScopeFeatures = modelScopeLayer.getSource().getFeatures();
    const modelScopeCoordinates = modelScopeFeatures.map(feature => feature.getGeometry().getCoordinates());
    fixedParameters.modelScope = modelScopeCoordinates.length > 0 ? modelScopeCoordinates : [];

    try {
      await save();
      const hide = message.loading('正在提取目标...');
      const result = await reqAssistFunction({
        taskid: taskId,
        task_type: taskType,
        user_id: userId,
        functionName: 'xgboost',
        assistInput: '300', // 固定训练次数
        modelName: 'extract_target_model', // 固定模型名称
        parameters: fixedParameters,
      });
      hide();
      if (result.code === 200) {
        message.success(result.message);
        setModelResults(result.data || {});
        // 刷新标注数据而不是整个页面
        await refreshMarkGeoJsonArr();
      } else {
        message.error(result.message || '提取目标失败');
      }
    } catch (error) {
      message.error('提取目标失败：' + error.message);
    }
  };

  // SAM预标注功能（固定参数）
  const handleSamPreAnnotation = async () => {
    let taskId = getTaskId;
    const taskType = taskInfo?.data[0].type;
    const userId = getUserId();

    if (!userId) {
      message.error('无法获取用户 ID，请检查用户信息');
      return;
    }

    // 固定参数设置
    const fixedParameters = {
      param1: '800',
      param2: '800',
      param3: '10',
      param4: '1',
      categoryMapping: JSON.stringify({}),
    };

    // 获取"模型作用范围"图层的多边形坐标
    const modelScopeLayer = generateMarkLayer.find(layer => layer.get('typeid') === 'modelScope');
    const modelScopeFeatures = modelScopeLayer.getSource().getFeatures();
    const modelScopeCoordinates = modelScopeFeatures.map(feature => feature.getGeometry().getCoordinates());
    fixedParameters.modelScope = modelScopeCoordinates.length > 0 ? modelScopeCoordinates : [];

    try {
      await save();
      const hide = message.loading('正在进行SAM预标注...');
      const result = await reqAssistFunction({
        taskid: taskId,
        task_type: taskType,
        user_id: userId,
        functionName: 'sam_inference',
        assistInput: '1', // SAM不需要训练次数，设置为1
        modelName: 'SAM', // 模型名称
        parameters: fixedParameters,
      });
      hide();
      if (result.code === 200) {
        message.success(result.message);
        console.log('SAM预标注完成，开始刷新数据...');
        // 刷新标注数据而不是整个页面
        await refreshMarkGeoJsonArr();
        console.log('数据刷新完成，绘制交互应该已重置');
      } else {
        message.error(result.message || 'SAM预标注失败');
      }
    } catch (error) {
      message.error('SAM预标注失败：' + error.message);
    }
  };

// 模型推理
  const handleInferenceClick = async () => {
    if (!selectedModel) {
      message.error('请先选择一个推理模型！');
      return;
    }

    let taskId = getTaskId;
    const taskType = taskInfo?.data[0].type;
    const userId = getUserId();
    if (!userId) {
      message.error('无法获取用户 ID，请检查用户信息');
      return;
    }

    let parameters = {};
    if (taskType === '目标检测') {
      parameters = {
        param1: param1,
        param2: param2,
        param3: param3,
        param4: param4,
        categoryMapping: categoryMapping,
      };
    } else {
      parameters = {
        param1: param1,
        param2: param2,
        param3: param3,
        param4: param4,
        categoryMapping: categoryMapping,
      };
    }

    // 获取"模型作用范围"图层的多边形坐标
    const modelScopeLayer = generateMarkLayer.find(layer => layer.get('typeid') === 'modelScope');
    const modelScopeFeatures = modelScopeLayer.getSource().getFeatures();
    const modelScopeCoordinates = modelScopeFeatures.map(feature => feature.getGeometry().getCoordinates());
    parameters.modelScope = modelScopeCoordinates.length > 0 ? modelScopeCoordinates : [];

    try {
      await save();
      const hide = message.loading('正在进行模型推理...');
      const result = await reqInferenceFunction({
        taskid: taskId,
        user_id: userId,
        model: selectedModel,
        parameters,
      });
      hide();
      if (result.code === 200) {
        message.success(result.message);
        // 刷新标注数据而不是整个页面
        await refreshMarkGeoJsonArr();
      } else {
        message.error(result.message || '模型推理失败');
      }
    } catch (error) {
      message.error('模型推理失败：' + error.message);
    }
  };
  // const handleAssistClick = async () => {
  //   let taskId = getTaskId;
  //   const taskType = taskInfo?.data[0].type; // 获取任务类型
  //
  //   // 添加调试日志，确认参数值
  //   console.log('Task ID:', taskId);
  //   console.log('Task Type:', taskType);
  //   console.log('Selected Model (functionName):', assistFunction);
  //   console.log('Training Epochs (assistInput):', assistInput);
  //   console.log('Parameters:', { param1, param2, param3, param4 });
  //
  //   // 校验：如果未选择模型，阻止调用并提示
  //   if (!assistFunction || assistFunction === 'none') {
  //     message.error('请先选择一个模型！');
  //     return;
  //   }
  //
  //   // 根据任务类型定义参数
  //   let parameters = {};
  //   if (taskType === '目标检测') {
  //     // 目标检测任务，发送固定值
  //     parameters = {
  //       param1: param1,
  //       param2: param2,
  //       param3: 'object',
  //       param4: 'object',
  //     };
  //   } else {
  //     // 地物分类任务，使用用户输入值或默认值
  //     parameters = {
  //       param1: param1 || '1',  // 若为空，使用默认值
  //       param2: param2 || '1',
  //       param3: param3 || '1',
  //       param4: param4 || '1',
  //     };
  //   }
  //
  //   try {
  //
  //     //先执行保存操作
  //     await save();
  //
  //     const hide = message.loading('正在调用辅助功能...');
  //     const result = await reqAssistFunction({
  //       taskid: taskId,
  //       functionName: assistFunction, // 确保传输用户选择的模型
  //       assistInput: assistInput || '150', // 未输入时默认 150
  //       parameters,
  //     });
  //     hide();
  //     if (result.code === 200) {
  //       message.success(result.message);
  //       window.location.reload();
  //     } else {
  //       message.error(result.message || '调用辅助功能失败');
  //     }
  //   } catch (error) {
  //     message.error('调用辅助功能失败：' + error.message);
  //   }
  // };

  const isObjectDetection = taskInfo?.data[0].type === '目标检测'; // 判断是否为目标检测任务

// 定义模型选项
  const objectDetectionModels = [
    { value: 'yolo', label: 'YOLO' },
  ];
  const classificationModels = [
    { value: 'sam_box', label: 'SAM_BOX' },
    { value: 'sam', label: 'SAM' },
    { value: 'light_unet', label: 'Light UNet' },
    { value: 'unet', label: 'UNet' },
    { value: 'fast_scnn', label: 'Fast SCNN' },
    { value: 'xgboost', label: 'XGBoost' },
    { value: 'svm', label: 'SVM' },
  ];
  // const [assistInput, setAssistInput] = useState(''); // 输入训练次数
  // const [assistFunction, setAssistFunction] = useState('default'); // Default function name
  // const [param1, setParam1] = useState('');
  // const [param2, setParam2] = useState('');
  // const [param3, setParam3] = useState('');
  // const [param4, setParam4] = useState('');
  // const handleAssistClick = async () => {
  //   let taskId = getTaskId;
  //   try {
  //     const hide = message.loading('正在调用辅助功能...');
  //     const result = await reqAssistFunction({
  //       taskid: taskId,
  //       functionName: assistFunction,
  //       assistInput: assistInput, // 训练次数输入框
  //       parameters: {
  //         param1: param1,
  //         param2: param2,
  //         param3: param3,
  //         param4: param4
  //       }
  //     });
  //     hide();
  //     if (result.code === 200) {
  //       message.success(result.message);
  //       window.location.reload();
  //     } else {
  //       message.error(result.message || '调用辅助功能失败');
  //     }
  //   } catch (error) {
  //     message.error('调用辅助功能失败：' + error.message);
  //   }
  // };
  //更新新绘制样本功能
  const update_label = async () => {
    let taskId = getTaskId;
    try {

      //先执行保存操作
      await save();

      const hide = message.loading('正在更新样本...');
      const result = await reqUqdateLabel({ taskid: taskId });
      hide();
      if (result.code === 200) {
        message.success(result.message);
        // 刷新标注数据而不是整个页面
        await refreshMarkGeoJsonArr();
      } else {
        message.error(result.message || '样本更新失败');
      }
    } catch (error) {
      message.error('调用样本更新失败失败：' + error.message);
    }
  };

  // 更新所有图层样式的函数
  const updateLayerStyles = useCallback(() => {
    if (!mapRef.current) return;

    generateMarkLayer.forEach(layer => {
      const typeId = layer.get('typeid');
      if (typeId === 'modelScope') {
        // 更新模型作用范围图层样式
        layer.setStyle(new Style({
          fill: new Fill({
            color: getTransparentColor('#ffcc33'),
          }),
          stroke: new Stroke({
            color: '#ffcc33',
            width: 3,
          }),
        }));
      } else {
        // 更新标注图层样式
        const typeInfo = taskInfo?.data?.[0]?.userArr
          ?.flatMap(user => user.typeArr)
          ?.find(type => type.typeId == typeId);

        if (typeInfo) {
          const styleFunction = (feature) => {
            const geometry = feature.getGeometry();
            const geometryType = geometry.getType();

            if (geometryType === 'Point') {
              return new Style({
                image: new CircleStyle({
                  radius: 6,
                  fill: new Fill({
                    color: getTransparentColor('#ffffff'),
                  }),
                  stroke: new Stroke({
                    color: typeInfo.typeColor,
                    width: 3,
                  }),
                }),
              });
            } else {
              return new Style({
                fill: new Fill({
                  color: getTransparentColor(typeInfo.typeColor),
                }),
                stroke: new Stroke({
                  color: typeInfo.typeColor,
                  width: 3,
                }),
              });
            }
          };
          layer.setStyle(styleFunction);
        }
      }
    });
  }, [generateMarkLayer, getTransparentColor, taskInfo]);

  // 当不透明度改变时更新所有图层样式
  useEffect(() => {
    updateLayerStyles();
  }, [fillOpacity, updateLayerStyles]);

  return (
    <>
      <BasicMap setMap={setMap} />

      {/* 不透明度控制器 */}
      <div className="opacity-control">
        <div className="opacity-label">填充不透明度</div>
        <Slider
          min={0}
          max={1}
          step={0.1}
          value={fillOpacity}
          onChange={setFillOpacity}
          className="opacity-slider"
          tooltip={{
            formatter: (value) => `${Math.round(value * 100)}%`
          }}
        />
        <div className="opacity-value">{Math.round(fillOpacity * 100)}%</div>
      </div>

      {/* 主工具栏 */}
      <div className="main-toolbar">
        {/* 任务信息区域 */}
        <div className="task-info-section">
          <div className="task-info">
            <span className="task-label">任务名称：</span>
            <span className="task-name">{taskInfo?.data[0].taskname}</span>
            <span className="task-label">任务类型：</span>
            <span className="task-type">{taskInfo?.data[0].type}</span>
          </div>
        </div>

        {taskInfo?.data[0]?.status === 0 ? (
          // 管理员审核工具区域
          <div className="audit-section">
            <h4 className="section-title">审核操作</h4>
            <div className="audit-buttons">
              <button
                className="audit-btn reject-btn"
                onClick={() => {
                  setShowAuditLoader(true);
                }}
              >
                <CloseOutlined />
                不通过
              </button>
              <button className="audit-btn approve-btn" onClick={passAudit}>
                <CheckOutlined />
                通过审核
              </button>
            </div>
          </div>
        ) : (
          // 用户标注工具区域
          <>
            {/* 标注工具区域 */}
            <div className="annotation-section">
              <h4 className="section-title">标注工具</h4>
              <div className="annotation-controls">
                <div className="layer-control">
                  <label>当前图层：</label>
                  <select className="layer-select" ref={layerSelect} defaultValue={'None'}>
                    <option value={'None'}>无</option>
                    <option value={0} style={{color: '#ff0000'}}>背景（消除标错区域）</option>
                    {taskInfo.data[0].userArr &&
                      taskInfo.data[0].userArr
                        .filter(({ username }) => username == currentUser)[0]
                        .typeArr.map((item) => {
                        return (
                          <option value={item.typeId} key={item.typeId}>
                            {item.typeName}
                          </option>
                        );
                      })}
                  </select>
                  <Tag color={toolbarState.color} className="layer-color-tag" />
                </div>

                <div className="shape-control">
                  <label>标注形状：</label>
                  <select
                    disabled={toolbarState.drawState}
                    className="shape-select"
                    ref={shapeSelect}
                    defaultValue={'None'}
                  >
                    <option value="None">无</option>
                    <option value="Point">点</option>
                    <option value="Box">矩形</option>
                    <option value="RotatableRectangle">可旋转矩形</option>
                    <option value="Polygon">多边形</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 编辑操作区域 */}
            <div className="edit-section">
              <h4 className="section-title">编辑操作</h4>
              <div className="edit-buttons">
                <button className="edit-btn delete-btn" onClick={deleteFeature}>
                  <DeleteOutlined />
                  删除
                </button>
                <div className="undo-redo-group">
                  <button className="edit-btn undo-btn" onClick={undo}>
                    <RollbackOutlined />
                  </button>
                  <button className="edit-btn redo-btn" onClick={recover}>
                    <RollbackOutlined className="recover" />
                  </button>
                </div>
              </div>
            </div>

            {/* 保存和更新区域 */}
            <div className="save-section">
              <h4 className="section-title">数据操作</h4>
              <div className="save-buttons">
                <button className="save-btn primary-btn" onClick={save}>
                  <CheckOutlined />
                  保存
                </button>
                {!isObjectDetection && (
                  <button className="update-btn secondary-btn" onClick={update_label}>
                    更新样本
                  </button>
                )}
              </div>
            </div>

            {/* 模型辅助工具区域 - 仅在地物分类任务中显示 */}
            {!isObjectDetection && (
              <div className="model-section">
                <h4 className="section-title">模型辅助工具</h4>
                <div className="model-tools">
                  <div className="quick-tools">
                    <button className="model-btn extract-btn" onClick={handleExtractTarget}>
                      提取目标
                    </button>
                    <button className="model-btn sam-btn" onClick={handleSamPreAnnotation}>
                      SAM预标注
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 弹窗组件 */}
      {showAuditLoader && (
        <CollectionCreateForm
          open={showAuditLoader}
          onCreate={onCreate}
          onCancel={onCancel}
          title="审核反馈"
          formItemList={() => {
            return (
              <Form.Item
                label="未通过原因"
                name="auditFeedback"
                rules={[{ required: true, message: '必须输入未通过原因！' }]}
              >
                <Input placeholder="边界、框不贴合/标注类别不符..." />
              </Form.Item>
            );
          }}
        />
      )}
      {showUploader && (
        <Uploader
          onUploadStatusChange={(flag) => {
            setShowUploader(flag);
          }}
          getShp={handleGetShp}
        />
      )}
    </>
  );
}
