function convertGeojson(arr) {
  const markGeoJson = [];
  arr.forEach((item) => {
    const features = [];
    const { typecode, typename, typecolor, geomarr, typeid } = item;
    geomarr.forEach((element) => {
      // Parse the GeoJSON string
      const geom = JSON.parse(element);
      features.push({
        geometry: geom,
        type: "Feature",
      });
    });
    markGeoJson.push({
      typecode,
      typename,
      typecolor,
      typeid,
      markGeoJson: { type: "FeatureCollection", features },
    });
  });
  return markGeoJson;
}

function geojsonToGeometry(geojsonArr) {
  const geometryArr = [];
  geojsonArr.forEach((item) => {
    item.features.forEach((feature) => {
      // Convert GeoJSON to string for database storage
      geometryArr.push({ 
        geom: JSON.stringify(feature.geometry), 
        typeid: item.typeid 
      });
    });
  });
  return geometryArr;
}

function covertCoordinate(geojsonArr) {
  console.log('Input to covertCoordinate:', geojsonArr);
  const geometryArr = [];
  
  geojsonArr.forEach((item) => {
    // The geometry is already in proper GeoJSON format
    // Just need to extract the required properties
    const geom = item.geom;
    const typeid = item.typeId;
    const markId = item.markId;
    
    geometryArr.push({ 
      geom, 
      typeid,
      markId 
    });
  });
  
  console.log('Output from covertCoordinate:', geometryArr);
  return geometryArr;
}

// 定义一个函数，该函数接受一个数组，两个对象作为参数
function covertCoordinateToPixel(
  arr,
  { minx: tifMinx, maxy: tifMaxy, serverHeight, serverWidth },
  { width, height }
) {
  const bboxArr = arr.map(({ geom, typeid, fid, typecolor }) => {
    // Parse GeoJSON
    const geometry = JSON.parse(geom);
    let resultArr = [];
    let xArray = [];
    let yArray = [];

    // Extract coordinates based on geometry type
    let coords;
    if (geometry.type === 'Polygon') {
      coords = geometry.coordinates[0]; // Get the first ring (exterior)
    } else if (geometry.type === 'MultiPolygon') {
      coords = geometry.coordinates[0][0]; // Get the first polygon's first ring
    } else if (geometry.type === 'Point') {
      // Handle Point geometry - single coordinate pair
      coords = [geometry.coordinates]; // Wrap in array to use same processing code
    } else {
      console.error(`Unsupported geometry type: ${geometry.type}`);
      return null;
    }

    // Process coordinates
    coords.forEach(([x, y]) => {
      resultArr.push(((x - tifMinx) / serverWidth) * width);
      resultArr.push(((tifMaxy - y) / serverHeight) * height);
      xArray.push(x);
      yArray.push(y);
    });

    // Calculate bounding box
    const minX = Math.min(...xArray);
    const minY = Math.min(...yArray);
    const maxX = Math.max(...xArray);
    const maxY = Math.max(...yArray);

    // Calculate pixel coordinates
    const pixMinx = ((minX - tifMinx) / serverWidth) * width;
    const pixMiny = ((tifMaxy - minY) / serverHeight) * height;
    const pixMaxx = ((maxX - tifMinx) / serverWidth) * width;
    const pixMaxy = ((tifMaxy - maxY) / serverHeight) * height;

    return {
      typeid,
      fid,
      typecolor,
      segmentation: [...resultArr],
      bbox: [pixMinx, pixMaxy, pixMaxx - pixMinx, pixMiny - pixMaxy],
      geoBbox: `${minX},${maxX},${minY},${maxY}`,
    };
  }).filter(Boolean); // Remove any null entries from unsupported geometry types

  return bboxArr;
}


// 定义一个函数，该函数接受一个数组作为参数
function getExtent(arr) {
  const bboxArr = arr.map(({ geom, typeid, fid, typecolor }) => {
    // Parse GeoJSON
    const geometry = JSON.parse(geom);
    let xArray = [];
    let yArray = [];

    // Extract coordinates based on geometry type
    let coords;
    if (geometry.type === 'Polygon') {
      coords = geometry.coordinates[0]; // Get the first ring (exterior)
    } else if (geometry.type === 'MultiPolygon') {
      coords = geometry.coordinates[0][0]; // Get the first polygon's first ring
    } else if (geometry.type === 'Point') {
      // Handle Point geometry - single coordinate pair
      coords = [geometry.coordinates]; // Wrap in array to use same processing code
    } else {
      console.error(`Unsupported geometry type: ${geometry.type}`);
      return null;
    }

    // Process coordinates
    coords.forEach(([x, y]) => {
      xArray.push(x);
      yArray.push(y);
    });

    // Calculate bounding box
    const minX = Math.min(...xArray);
    const minY = Math.min(...yArray);
    const maxX = Math.max(...xArray);
    const maxY = Math.max(...yArray);

    return { 
      typeid, 
      fid, 
      typecolor, 
      bbox: `${minX},${minY},${maxX},${maxY}` 
    };
  }).filter(Boolean); // Remove any null entries from unsupported geometry types

  return bboxArr;
}

module.exports = {
  geojsonToGeometry,
  convertGeojson,
  getExtent,
  covertCoordinate,
  covertCoordinateToPixel,
};

/* function convertGeojson(arr) {
  const features = [];
  arr.forEach((item) => {
    const coordArr = [];
    const itemArr = item.geom.split(",");
    itemArr.forEach((item, index) => {
      if (index % 2 == 0) {
        coordArr.push([Number(itemArr[index]), Number(itemArr[index + 1])]);
      }
    });
    features.push({
      geometry: {
        type: "MultiPolygon",
        crs: { type: "name", properties: { name: "EPSG:3857" } },
        coordinates: [[coordArr]],
      },
      type: "Feature",
    });
  });
  // console.log({ type: "FeatureCollection", features });
  return { type: "FeatureCollection", features };
} */
/* 
输入
[
  {
    typecode:001,
    typename: "建筑",
    typecolor:'#666',
    geomArr:[]
  },
  {
    typecode:002,
    typename: "水体",
    typecolor:'#666',
    geomArr:[]
  }
]
*/
/* function geojsonToGeometry(geojson) {
  const geometryArr = [];
  geojson.features.forEach((item) => {
    const itemArr = item.geometry.coordinates.flat();
    const tempArr = [];
    // console.log(itemArr);
    // itemArr.forEach((item) => {
    //   const str = item.join(" ");
    //   tempArr.push(str);
    // });
    // geometryArr.push({ geom: `MULTIPOLYGON(((${tempArr.join(",")})))` });
    geometryArr.push({ geom: `${itemArr}` });
  });
  console.log(geometryArr);
  return geometryArr;
} */
