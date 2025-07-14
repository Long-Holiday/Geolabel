const fs = require("fs");
const path = require("path");
const { getExtent, covertCoordinateToPixel } = require("../utils/convert.js");
const request = require("../utils/request.js");
const { mergeImages, generateStuffImg } = require("../utils/canvasUtils.js");
const archiver = require("archiver");
const OUTPUT_DIR = path.join(__dirname, `../public/dataset`);
const SERVERDOWNLOAD_DIR = path.join(__dirname, "../public/img");
const SAMPLEDOWNLOAD_DIR = path.join(__dirname, "../public/dataset_temp");
const DatasetModel = require("../models/datasetModel");
const TaskModel = require("../models/taskModel");
const MarkModel = require("../models/markModel");
const TypeModel = require("../models/typeModel");
const geoserverController = require("../controller/geoserverController");

// 用于存储最后合并的文件路径
let lastMergedFilePath = null;

const getDataSet = async (ctx, next) => {
  const { username, isAdmin, ispublic } = ctx.request.query;
  // 查询符合用户的所有taskid
  let taskIdArr = [];
  // 管理员可查询全部样本
  if (Number(isAdmin)) {
    console.log("admin查询");
    taskIdArr = await TaskModel.findAllTask();
    // .where("task.taskid", "=", taskid);
  } else {
    console.log("user查询");
    if (ispublic == 1) {
      taskIdArr = await TaskModel.findPublicTask();
    } else {
      taskIdArr = await TaskModel.findTasksByUsername(username);
    }
  }
  console.log(taskIdArr);
  let rows = [];
  // 遍历taskid，根据样本库记录查询样本
  if (taskIdArr.length) {
    for (const { taskid } of taskIdArr) {
      const [sampleInfo] = await DatasetModel.findDatasetByTaskId(taskid);
      // 获取用户列表
      const userArrList = await TaskModel.findUserListByTaskId(taskid);
      const userArr = userArrList.map(({ username }) => username);
      // 如果没有符合的样本就不退入数组中
      if (sampleInfo) {
        //添加到rows中，...扩展运算符
        rows.push({ ...sampleInfo, userArr });
      }
    }
  }
  console.log(rows, "rows");

  // 返回图片
  ctx.body = { code: 200, data: rows };
};

const getSampleImageList = async (ctx, next) => {
  // 从请求中获取查询参数
  const { pageSize, current, sampleid } = ctx.query;
  // 使用样本ID获取数据库中的总图像数量
  const total = await DatasetModel.getTotalImgNumBySampleId(sampleid);
  // 根据样本ID、页大小和当前页数从数据库中找到图像源ID
  const rows = await DatasetModel.findImgSrcIdBySampleId(
    sampleid,
    pageSize,
    current
  );
  // 将获取到的数据以及总数作为响应体返回给客户端
  ctx.body = { code: 200, data: rows, total: total.count };
};

const setDatasetStatus = async (ctx, next) => {
  const { ispublic, sampleid } = ctx.request.body;
  console.log("状态", ispublic);
  await DatasetModel.updateDatasetStatusBySampleId(ispublic, sampleid);
  ctx.body = { code: 200 };
};
//生成样本集
const generateDataset = async (ctx, next) => {
  const { taskid } = ctx.request.body;
  const hasGenerate = await DatasetModel.hasGenerateDataset(taskid);

  if (hasGenerate.length) {
    console.log("已有样本");
    ctx.body = { code: 409, message: "已有样本" };
    return;
  }
    // const markSourceArr = await knex(taskInfo[0].marktable).select([
  //   "geom",
  //   "typeid",
  //   "fid",
  // ]);
  // 根据任务ID获取任务信息，返回的对象数组，用[0]取第一个对象，只有一个对象
  const taskInfo = await TaskModel.selectTaskById(taskid);

  // 获取标记信息数组
  const markSourceArr = await MarkModel.getMarkInfoArr(taskInfo[0].marktable);
//创建不公开的数据集
  const sampleInfo = await DatasetModel.createDataset(taskid);

  const extentArr = getExtent(markSourceArr);

  // 定义下载目录，这是一个临时目录，用于存储从数据库下载的原始数据
  const DOWNLOAD_DIR = path.join(
    __dirname,
    `../public/dataset_temp/${taskInfo[0].marktable}`
  );
  // 定义输出目录，这是最终的数据集存储位置
  const OUTPUT_DIR = path.join(__dirname, `../public/dataset/COCO_${taskid}`);
  // 定义图像输出目录，这是存储数据集中的图像的位置
  const OUTPUT_DIR_IMAGE = path.join(
    __dirname,
    `../public/dataset/COCO_${taskid}/images`
  );
  // 定义注释输出目录，这是存储数据集中的注释的位置
  const OUTPUT_DIR_ANNOTATIONS = path.join(
    __dirname,
    `../public/dataset/COCO_${taskid}/annotations`
  );

  // 如果没有就创建文件夹，stat方法获取文件夹的状态信息，包括大小、创建时间、修改时间等等
  fs.stat(DOWNLOAD_DIR, (err) => {
    if (err) {
      fs.mkdir(DOWNLOAD_DIR, (err) => {
        console.log(err);
      });
    }
  });
  // 创建coco文件夹
  fs.mkdirSync(OUTPUT_DIR);
  console.log("创建coco文件夹");
  fs.mkdirSync(OUTPUT_DIR_IMAGE);
  console.log("创建coco/images文件夹");
  let images = [];
  // 请求一整张 tif 图片作为coco文件夹中的img
  // 从Geoserver获取地图信息
  const img = await geoserverController.getGeoserverInfo(taskInfo[0].mapserver);

  // 从返回的数据中解构出边界框的最小和最大x、y值，以及空间参考系统（srs）
  const {
    coverage: {
      nativeBoundingBox: { minx, miny, maxx, maxy },
      srs,
    },
  } = img.data;

  // 打印出请求的坐标
  console.log({ minx, miny, maxx, maxy }, "请求的坐标");

  // 定义图像的高度
  const height = 2048;

  // 计算图像的宽度，这是根据边界框的宽度和高度的比例来计算的
  const width = Math.ceil(((maxx - minx) / (maxy - miny)) * height);

  // 将图像的文件名、id、宽度和高度添加到images数组中
  images.push({
    file_name: `train_${1}.jpeg`,
    id: 1,
    width,
    height,
  });

  // 下载图片
  const result = await geoserverController.getGeoserverImg(
    taskInfo[0].mapserver,
    width,
    height,
      `${minx},${maxx},${miny},${maxy}`,
    // `${minx},${miny},${maxx},${maxy}`,
    srs
  );
  // 区分样本集类型
  let filePath;
  if (taskInfo[0].type == "地物分类") {
    filePath = path.join(OUTPUT_DIR_IMAGE, `val_1.jpeg`); // 设置本地文件路径
  } else {
    filePath = path.join(OUTPUT_DIR_IMAGE, `train_1.jpeg`); // 设置本地文件路径
  }
  const writer = fs.createWriteStream(filePath);
  // 将响应流中的数据写入到可写流中，也可使用.write(data)写入数据到流中
  result.data.pipe(writer);
  fs.mkdirSync(OUTPUT_DIR_ANNOTATIONS);
  console.log("创建coco/annotations文件夹");
  let imagePaths = [];
  let annotations = [];
  let categories = [];
  const segmentationArr = covertCoordinateToPixel(
    markSourceArr,
    {
      minx: Math.abs(minx),
      maxy: Math.abs(maxy),
      serverHeight: Math.abs(maxy) - Math.abs(miny),
      serverWidth: Math.abs(maxx) - Math.abs(minx),
    },
    { width, height }
  );
  // 生成地物分类样本，用canva一个点一个点的画图像
  if (taskInfo[0].type == "地物分类") {
    generateStuffImg(
      width,
      height,
      segmentationArr,
      path.join(OUTPUT_DIR_IMAGE, `train_1.jpeg`)
    );
  }
  // console.log(segmentationArr, "segmentationArr");
  // 生成样本库页面的小样本展示图
  for (let index = 0; index < segmentationArr.length; index++) {
    // bbox是图片中的像素坐标，geoBbox是地理坐标
      // 从数组中获取当前元素的相关信息
    const { typeid, fid, segmentation, bbox, geoBbox, typecolor } =
      segmentationArr[index];
    // 去重，类别信息
    if (!categories.find((item) => item.id == typeid)) {
      const [{ typename }] = await TypeModel.getTypeNameById(typeid);
      console.log(typeid, typename);
      categories.push({ name: typename, id: typeid, color: typecolor });
    }
     // 将当前元素的相关信息添加到annotations数组中
    annotations.push({
      id: fid,
      category_id: typeid,
      // img_id: Math.ceil((index + 1) / 4),
      img_id: 1,
      bbox,
      segmentation: [segmentation],
    });
    // 下载图片，从geoserver上传的tif数据下载
    const result = await geoserverController.getGeoserverImg(
      taskInfo[0].mapserver,
      256,
      256,
      geoBbox,
      "EPSG:3857"
    );
    const filePath = path.join(DOWNLOAD_DIR, `${fid}.jpeg`); // 设置本地文件路径
    const writer = fs.createWriteStream(filePath);
    // 将响应流中的数据写入到可写流中
    result.data.pipe(writer);

    await DatasetModel.insertSampleImgInfo(sampleInfo[0].sampleid, typeid, fid);
    // src={`http://localhost:3000/sampleImage?taskid=26&imgsrc=1`}
    console.log("图片" + fid + "生成成功！");
    // imagePaths.push(
    //   `http://localhost:3000/sampleImage?taskid=${taskid}&imgsrc=${fid}`
    // );
  }
  //#region
  /*   for (const { typeid, fid, bbox } of extentArr) {
    // 去重
    if (!categories.find((item) => item.id == typeid)) {
      const [{ typename }] = await knex("type")
        .select(["typename"])
        .where({ typeid });
      console.log(typeid, typename);
      categories.push({ name: typename, id: typeid });
    }
    annotations.push({
      id: fid,
      category_id: typeid,
    });
    const params = {
      service: "WMS",
      version: "1.1.1",
      request: "GetMap",
      layers: `LUU:${taskInfo[0].mapserver}`,
      styles: "",
      bbox,
      width: 128, // 指定宽度
      height: 128, // 指定高度
      srs: "EPSG:3857",
      format: "image/jpeg",
      transparent: true,
      exceptions: "application/vnd.ogc.se_inimage",
    };
    // 下载图片
    const result = await request.get(`/LUU/wms`, {
      params,
      responseType: "stream",
    });
    const filePath = path.join(DOWNLOAD_DIR, `${fid}.jpeg`); // 设置本地文件路径
    const writer = fs.createWriteStream(filePath);
    // 将响应流中的数据写入到可写流中
    result.data.pipe(writer);
    await knex("sampleimg").insert({
      sampleid: sampleInfo[0].sampleid,
      typeid,
      imgsrc: fid,
    });
    // src={`http://localhost:3000/sampleImage?taskid=26&imgsrc=1`}
    console.log("图片" + fid + "生成成功！");
    imagePaths.push(
      `http://localhost:3000/sampleImage?taskid=${taskid}&imgsrc=${fid}`
    );
  } */
  //#endregion
  //#region
  // 循环合成图片
  // for (let i = 0, j = 1; i < imagePaths.length; i += 4, j++) {
  //   const args = imagePaths.slice(i, i + 4);
  //   mergeImages(
  //     [...args],
  //     path.join(OUTPUT_DIR_IMAGE, `train_${j}.jpeg`),
  //     2,
  //     256,
  //     256
  //   );
  //   images.push({
  //     file_name: `train_${j}.jpeg`,
  //     id: j,
  //     width: 256,
  //     height: 256,
  //   });
  // }
  //#endregion
  // 生成JSON文件
  const json = {
    images,
    annotations,
    categories,
  };
  const jsonData = JSON.stringify(json);
  fs.writeFileSync(
    path.join(OUTPUT_DIR_ANNOTATIONS, "annotations.json"),
    jsonData
  );
  console.log("JSON文件生成成功！");
  ctx.body = { code: 200, info: "样本生成成功！" };
};

const deleteDataset = async (ctx, next) => {
  const { sampleid, taskid } = ctx.query;
  await DatasetModel.deleteDatastoreById(sampleid);
  const DOWNLOAD_DIR = path.join(
    __dirname,
    `../public/dataset_temp/mark_${taskid}`
  );
  fs.rmSync(DOWNLOAD_DIR, { recursive: true });
  fs.rmSync(path.join(OUTPUT_DIR, `COCO_${taskid}`), { recursive: true });
  ctx.body = { code: 200 };
};

// 定义一个异步函数，该函数接受一个上下文对象作为参数
const downloadDataset = async (ctx) => {
  // 从上下文对象的参数中获取任务ID
  const { taskid } = ctx.params;
  // 创建一个指向"COCO.zip"的可写流
  const output = fs.createWriteStream("COCO.zip");
  // 创建一个archiver对象，用于创建压缩包
  const archive = archiver("zip", { zlib: { level: 6 } });
  // 计算输出路径
  const outputPath = path.join(OUTPUT_DIR, `COCO_${taskid}`);
  // 将archiver对象的输出管道到可写流
  archive.pipe(output);
  // 读取输出路径下的所有文件和子文件夹
  const files = fs.readdirSync(outputPath, {
    withFileTypes: true,
  });
  // 遍历文件和子文件夹
  files.forEach((file) => {
    // 如果是文件，则将文件添加到压缩包中
    if (file.isFile()) {
      archive.file(`${outputPath}/${file.name}`, { name: file.name });
    }
    // 如果是子文件夹，则将子文件夹添加到压缩包中
    else if (file.isDirectory()) {
      archive.directory(`${outputPath}/${file.name}`, file.name);
    }
  });
  // 最终化压缩包，表示已经没有更多的数据要添加到压缩包中
  await archive.finalize();
  // 设置响应头，指定响应体的类型为"application/zip"，并指定下载的文件名为"files.zip"
  ctx.set("Content-Type", "application/zip");
  ctx.set("Content-Disposition", "attachment; filename=files.zip");
  // 创建一个指向"COCO.zip"的可读流，并将其设置为响应体
  ctx.body = fs.createReadStream("COCO.zip");
};

// 下载多个数据集合并为一个COCO数据集
const downloadMultipleDatasets = async (ctx) => {
  const { taskIds } = ctx.request.body;
  
  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    ctx.status = 400;
    ctx.body = { code: 400, message: '请提供有效的任务ID数组' };
    return;
  }

  // 创建临时目录来合并数据集
  const tempDir = path.join(__dirname, '../public/dataset_temp/merged_coco');
  const tempImagesDir = path.join(tempDir, 'images');
  const tempAnnotationsDir = path.join(tempDir, 'annotations');
  
  // 确保目录存在
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true });
  }
  fs.mkdirSync(tempDir);
  fs.mkdirSync(tempImagesDir);
  fs.mkdirSync(tempAnnotationsDir);

  // 收集所有数据集的信息
  let mergedImages = [];
  let mergedAnnotations = [];
  let mergedCategories = [];
  let imageIdOffset = 0;
  let annotationIdOffset = 0;
  let currentImageId = 1;
  
  // 处理每个任务
  for (const taskId of taskIds) {
    const sourcePath = path.join(OUTPUT_DIR, `COCO_${taskId}`);
    
    if (!fs.existsSync(sourcePath)) {
      console.warn(`任务ID ${taskId} 的数据集不存在，已跳过`);
      continue;
    }
    
    // 读取annotations.json
    try {
      const annotationsPath = path.join(sourcePath, 'annotations', 'annotations.json');
      if (!fs.existsSync(annotationsPath)) {
        console.warn(`任务ID ${taskId} 的annotations.json不存在，已跳过`);
        continue;
      }
      
      const data = JSON.parse(fs.readFileSync(annotationsPath, 'utf8'));
      
      // 调整图像和注释的ID
      if (data.images) {
        // 处理单个图像对象的情况
        if (!Array.isArray(data.images)) {
          const image = data.images;
          // 修改文件名，添加任务ID前缀以避免冲突
          const newFileName = `task_${taskId}_${image.file_name}`;
          // 复制图像文件
          fs.copyFileSync(
            path.join(sourcePath, 'images', image.file_name),
            path.join(tempImagesDir, newFileName)
          );
          
          // 调整图像信息并添加到合并集合
          const newImage = {
            file_name: newFileName,
            id: currentImageId,
            width: image.width,
            height: image.height
          };
          mergedImages.push(newImage);
          currentImageId++;
        } else {
          // 处理图像数组的情况
          for (const image of data.images) {
            // 修改文件名，添加任务ID前缀以避免冲突
            const newFileName = `task_${taskId}_${image.file_name}`;
            // 复制图像文件
            fs.copyFileSync(
              path.join(sourcePath, 'images', image.file_name),
              path.join(tempImagesDir, newFileName)
            );
            
            // 调整图像信息并添加到合并集合
            const newImage = {
              file_name: newFileName,
              id: currentImageId,
              width: image.width,
              height: image.height
            };
            mergedImages.push(newImage);
            currentImageId++;
          }
        }
      }
      
      // 处理注释，更新引用的图像ID
      if (data.annotations) {
        if (Array.isArray(data.annotations)) {
          for (const annotation of data.annotations) {
            // 根据原始img_id找到对应的新图像ID
            const originalImgId = annotation.img_id;
            // 调整注释的ID和引用的图像ID
            const newAnnotation = {
              ...annotation,
              id: annotationIdOffset + annotation.id,
              img_id: imageIdOffset + originalImgId
            };
            mergedAnnotations.push(newAnnotation);
          }
        }
      }
      
      // 合并类别
      if (data.categories) {
        for (const category of Array.isArray(data.categories) ? data.categories : [data.categories]) {
          // 检查是否已存在相同ID的类别
          if (!mergedCategories.find(c => c.id === category.id)) {
            mergedCategories.push(category);
          }
        }
      }
      
      // 更新偏移量
      imageIdOffset = currentImageId - 1;
      annotationIdOffset += data.annotations ? (Array.isArray(data.annotations) ? data.annotations.length : 1) : 0;
      
    } catch (error) {
      console.error(`处理任务ID ${taskId} 时出错:`, error);
    }
  }
  
  // 写入合并后的annotations.json
  const mergedData = {
    images: mergedImages,
    annotations: mergedAnnotations,
    categories: mergedCategories
  };
  
  fs.writeFileSync(
    path.join(tempAnnotationsDir, 'annotations.json'),
    JSON.stringify(mergedData)
  );
  
  // 创建压缩文件
  const zipPath = path.join(__dirname, 'merged_coco.zip');
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 6 } });
  
  archive.pipe(output);
  archive.directory(tempDir, 'merged_coco');
  await archive.finalize();
  
  // 记录生成的文件路径，用于后续下载
  lastMergedFilePath = zipPath;
  
  // 返回成功信息，不直接发送文件
  ctx.body = { 
    code: 200, 
    message: '数据集合并成功，请点击下载按钮获取文件',
    taskCount: taskIds.length
  };
};

// 下载最近合并的文件
const downloadMergedFile = async (ctx) => {
  // 检查是否有最近合并的文件
  if (!lastMergedFilePath || !fs.existsSync(lastMergedFilePath)) {
    ctx.status = 404;
    ctx.body = { code: 404, message: '找不到合并的文件，请先合并数据集' };
    return;
  }
  
  // 设置响应头
  ctx.set('Content-Type', 'application/zip');
  ctx.set('Content-Disposition', 'attachment; filename=merged_coco.zip');
  ctx.body = fs.createReadStream(lastMergedFilePath);
  
  // 注册清理函数
  ctx.res.on('finish', () => {
    // 仅在下载完成后删除文件
    if (fs.existsSync(lastMergedFilePath)) {
      setTimeout(() => {
        try {
          fs.unlinkSync(lastMergedFilePath);
          console.log('已删除合并文件:', lastMergedFilePath);
          lastMergedFilePath = null; // 清除引用
        } catch (error) {
          console.error('删除合并文件时出错:', error);
        }
      }, 1000); // 给文件关闭一些时间
    }
    
    // 删除临时目录
    const tempDir = path.join(__dirname, '../public/dataset_temp/merged_coco');
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true });
        console.log('已删除临时目录:', tempDir);
      } catch (error) {
        console.error('删除临时目录时出错:', error);
      }
    }
  });
};

module.exports = {
  getDataSet,
  getSampleImageList,
  setDatasetStatus,
  generateDataset,
  deleteDataset,
  downloadDataset,
  downloadMultipleDatasets,
  downloadMergedFile,
};
