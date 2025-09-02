// 导入fs-extra模块，这是一个对Node.js内置fs模块的扩展，提供了更多便利的文件系统操作函数
const fse = require("fs-extra");
// 导入path模块，这是Node.js的内置模块，用于处理文件和目录的路径
const path = require("path");
// 设置临时目录的路径，__dirname是当前文件所在的目录，然后通过path.join函数，将其与"../public/temp"连接起来，得到临时目录的完整路径
const TEMP_DIR = path.join(__dirname, "../public/temp");
// 设置上传目录的路径，类似于上面的临时目录，这里是"../public/uploads"
const UPLOAD_DIR = path.join(__dirname, "../public/uploads");
// 导入FileModel模块，这可能是一个定义了文件数据模型的模块，用于操作文件相关的数据
const FileModel = require("../models/fileModel");

/**
 * 上传一个分片
 * @param {类似于request} ctx 
 * @param {这个函数处理完成之后需要处理其它请求，可以使用next（）函数} next 
 */
const upLoadTif = async (ctx, next) => {
  // koa-body 在处理完 file 后会绑定在 ctx.request.files
  const file = ctx.request.files.file;
  //
  const fileNameArr = file.originalFilename.split(".");
  // 存放切片的目录
  const chunkDir = `${TEMP_DIR}/${fileNameArr[0]}`;
  if (!fse.existsSync(chunkDir)) {
    // 没有目录就创建目录
    // 创建大文件的临时目录
    await fse.mkdirs(chunkDir);
  }
  // 原文件名.index - 每个分片的具体地址和名字
  const dPath = path.join(chunkDir, fileNameArr[1]);

  // 将分片文件从 temp 中移动到本次上传大文件的临时目录
  await fse.move(file.filepath, dPath, { overwrite: true });
  ctx.body = { code: 200, info: "文件上传成功！" };
};
// 定义一个异步函数，用于合并文件切片
const mergeTif = async (ctx, next) => {
  // 从请求体中获取文件名、更新时间和文件大小
  const { fileName, updatetime, size } = ctx.request.body;
  // 通过分割文件名获取文件的主名
  const fname = fileName.split(".")[0]; 
  // 拼接出存放文件切片的目录路径
  const chunkDir = path.join(TEMP_DIR, fname); 
  // 读取文件切片目录中的所有文件切片
  const chunks = await fse.readdir(chunkDir);
  // 对文件切片进行排序，然后遍历每个文件切片
  chunks
    .sort((a, b) => a - b)
    .map(async (chunkPath) => {
      // 读取文件切片的内容，然后追加到目标文件中，实现文件切片的合并
       // 使用 'fs-extra' 模块的 'appendFileSync' 方法将每个文件切片的内容追加到目标文件中
      fse.appendFileSync(
        path.join(UPLOAD_DIR, fileName), // 目标文件的路径
        fse.readFileSync(path.join(chunkDir, chunkPath)) // 读取文件切片的内容
      );
    });
  // 删除存放文件切片的临时目录
  fse.removeSync(chunkDir);
  // 在数据库中创建一个新的文件记录
  await FileModel.createFile(fileName, updatetime, size);
  // 设置响应体，返回成功的状态码和信息
  ctx.body = {
    code: 200,
    info: "文件合并成功！",
  };
};

// 定义一个异步函数getAllFiles，它接收两个参数：ctx和next
const getAllFiles = async (ctx, next) => {
  // 从ctx对象中解构出query对象，进一步解构出current和pageSize属性
  const {
    query: { current, pageSize },
  } = ctx;
  // 调用FileModel的getTotalFiles方法，获取文件总数，并解构出count属性，赋值给total
  const { count: total } = await FileModel.getTotalFiles();
  // 调用FileModel的getFiles方法，传入current和pageSize参数，获取文件列表
  const rows = await FileModel.getFiles(current, pageSize);
  // 在控制台打印文件列表
  console.log(rows);
  // 将文件列表、操作成功标志和文件总数作为响应体返回
  ctx.body = { data: rows, success: true, total };
};

// 定义一个异步函数updateFile，它接收两个参数：ctx和next
const updateFile = async (ctx, next) => {
  // 从请求体中解构出fileid、filename、originfilename和updatetime属性
  const { fileid, filename, originfilename, updatetime } = ctx.request.body;

  try {
    // 使用fse.rename方法修改文件名
    // 第一个参数是原文件的路径，第二个参数是新文件的路径
    // 第三个参数是一个回调函数，用于处理重命名过程中可能出现的错误
    fse.rename(
      path.join(UPLOAD_DIR, originfilename),
      path.join(UPLOAD_DIR, filename),
      (err) => {
        if (err) {
          // 如果出现错误，打印错误信息并返回
          console.error(err);
          return;
        }
        // 如果没有出现错误，打印成功信息
        console.log("文件名修改成功");
      }
    );
    // 调用FileModel的updateFile方法，更新数据库中的文件信息
    await FileModel.updateFile(fileid, filename, updatetime);
  } catch (error) {
    // 如果在更新过程中出现错误，根据错误代码处理错误
    if (error.code == 23505) {
      // 如果错误代码是23505（唯一约束冲突），说明文件名重复，返回错误信息
      ctx.body = { code: error.code, info: "文件名重复" };
    }
    // 返回false，结束函数执行
    return false;
  }
  // 如果没有出现错误，打印成功信息
  console.log("更新文件信息成功！");
  // 返回成功信息
  ctx.body = { code: 200, info: "修改成功！" };
};

// 定义一个异步函数deleteFile，它接收两个参数：ctx和next
const deleteFile = async (ctx, next) => {
  // 从请求参数中解构出filename属性
  const { filename } = ctx.params;
  // 在控制台打印文件名
  console.log(filename);
  // 使用fse.unlink方法删除指定路径的文件
  await fse.unlink(path.join(UPLOAD_DIR, filename));
  // 调用FileModel的deleteFileByFilename方法，从数据库中删除指定文件名的文件记录
  await FileModel.deleteFileByFilename(filename);
  // 设置响应体，返回成功的状态码和信息
  ctx.body = { code: 200, info: "删除文件成功！" };
};

// 定义一个异步函数getFilePath，它接收两个参数：ctx和next
const getFilePath = async (ctx, next) => {
  
  // 从请求查询参数中解构出filename属性
  const { filename } = ctx.query;
  // 拼接出文件的路径
  const filePath = path.join(UPLOAD_DIR, filename);
  // 设置响应体，返回成功的状态码和文件路径
  ctx.body = { code: 200, data: filePath };
  console.log(111);
};

module.exports = {
  upLoadTif,
  mergeTif,
  getAllFiles,
  updateFile,
  deleteFile,
  getFilePath,
};
