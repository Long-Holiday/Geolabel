package com.example.labelMark.controller;

import cn.hutool.core.util.ObjectUtil;
import com.example.labelMark.domain.SysFile;
import com.example.labelMark.service.SysFileService;
import com.example.labelMark.utils.ResultGenerator;
import com.example.labelMark.vo.LoginUser;
import com.example.labelMark.vo.constant.Result;
import com.example.labelMark.vo.constant.StatusEnum;
import io.swagger.annotations.ApiOperation;
import org.apache.commons.io.FileUtils;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.annotation.Resource;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;


/**
 * <p>
 * 前端控制器
 * </p>
 */
@RestController
@RequestMapping("/files")
public class SysFileController {

    @Resource
    private SysFileService sysfileService;

    private static final String TEMP_DIR = System.getProperty("user.dir") + File.separator + "src/main/java/com/example/labelMark/resource/temp";

    private static final String UPLOAD_DIR = System.getProperty("user.dir") + File.separator + "src/main/java/com/example/labelMark/resource/output";

    @PostMapping("/uploadTif")
    public Result uploadTif(@RequestParam MultipartFile file) {
        try {
            // 获取文件名和扩展名
            String originalFileName = file.getOriginalFilename();
            if (originalFileName == null) {
                throw new RuntimeException("文件名不能为空");
            }

            // 分割文件名（例如 name.index.extension）
            String[] fileNameArr = originalFileName.split("\\.");
            if (fileNameArr.length < 3) {
                throw new RuntimeException("文件名格式不正确");
            }

            // 主文件名部分
            String baseFileName = fileNameArr[0];

            // 构建临时目录路径
            String chunkDir = Paths.get(TEMP_DIR, baseFileName).toString();
            // 创建临时目录
            Path directories = Files.createDirectories(Paths.get(chunkDir));
            System.out.println(directories);
            // 构建分片文件路径
            Path chunkFilePath = Paths.get(chunkDir, originalFileName);

            // 拷贝文件分片到指定路径
            Files.copy(file.getInputStream(), chunkFilePath, StandardCopyOption.REPLACE_EXISTING);

        } catch (IOException | IllegalStateException e) {
            throw new RuntimeException(e);
        }

        return ResultGenerator.getSuccessResult();
    }


    @PostMapping("/mergeTif")
    public Result mergeTif(@RequestBody Map<String, Object> map) throws IOException {
        String fileName = map.get("fileName").toString();
        String updatetime = map.get("updatetime").toString();
        String size = map.get("size").toString();
        String setName = map.containsKey("setName") ? map.get("setName").toString() : null;
        String[] fileNameArr = fileName.split("\\.");
        String chunkDir = Paths.get(TEMP_DIR, fileNameArr[0]).toString();
        String destFilePath = Paths.get(UPLOAD_DIR, fileName).toString(); // Include file name and extension

        // 获取当前登录用户ID
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        LoginUser loginUser = (LoginUser) authentication.getPrincipal();
        Integer userId = loginUser.getSysUser().getUserid();

        // Ensure the upload directory exists
        Files.createDirectories(Paths.get(UPLOAD_DIR));

        try {
            File dir = new File(chunkDir);
            File[] chunks = dir.listFiles();
            if (chunks != null) {
                Arrays.sort(chunks, new Comparator<File>() {
                    @Override
                    public int compare(File o1, File o2) {
                        String[] split1 = o1.getName().split("\\.");
                        String[] split2 = o2.getName().split("\\.");
                        Integer index1 = Integer.valueOf(split1[1]);
                        Integer index2 = Integer.valueOf(split2[1]);
                        return index1.compareTo(index2);
                    }
                });

                try (FileOutputStream out = new FileOutputStream(destFilePath)) {
                    for (File chunk : chunks) {
                        Files.copy(chunk.toPath(), out);
                    }
                }
            }

            // 删除临时切片目录
            Files.walk(Paths.get(chunkDir))
                    .sorted(Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(File::delete);

            // 在数据库中创建文件记录，包含用户ID和影像集名称
            sysfileService.createFile(fileName, updatetime, size, userId, setName);

        } catch (IOException e) {
            throw new RuntimeException(e);
        }

        return ResultGenerator.getSuccessResult("文件合并成功！");
    }

    @PostMapping("/upload")
    public Result upload(@RequestParam("file") MultipartFile file,
                         @RequestParam("fileName") String fileName,
                         @RequestParam("chunkNumber") int chunkNumber,
                         @RequestParam("totalChunks") int totalChunks) throws IOException {


        File uploadDirectory = new File(UPLOAD_DIR);
        if (!uploadDirectory.exists()) {
            uploadDirectory.mkdirs();
        }

        File destFile = new File(UPLOAD_DIR + File.separator + fileName + ".part" + chunkNumber);
        FileUtils.copyInputStreamToFile(file.getInputStream(), destFile);

        if (chunkNumber == totalChunks) { // 如果所有部分都已上传，则将它们组合成一个完整的文件
            String targetFilePath = UPLOAD_DIR + File.separator + fileName;
            for (int i = 1; i <= totalChunks; i++) {
                File partFile = new File(UPLOAD_DIR + File.separator + fileName + ".part" + i);
                try (FileOutputStream fos = new FileOutputStream(targetFilePath, true)) {
                    FileUtils.copyFile(partFile, fos);
                    partFile.delete();
                }
            }
        }

        return ResultGenerator.getSuccessResult("Upload successful");
    }


    @GetMapping("/getAllFiles")
    @ApiOperation("")
    public Map getAllFiles(Integer current,
                           Integer pageSize,
                           @RequestParam(required = false) Integer fileId,
                           @RequestParam(required = false) String setName) {
        try {
            //            无参时默认值
            if (ObjectUtil.isEmpty(current)) {
                current = 1;
            }
            if (ObjectUtil.isEmpty(pageSize)) {
                pageSize = 5;
            }
            
            // 获取当前登录用户ID
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            LoginUser loginUser = (LoginUser) authentication.getPrincipal();
            Integer userId = loginUser.getSysUser().getUserid();
            
            List<SysFile> sysfiles = sysfileService.getAllFiles(current, pageSize, fileId, userId, setName);
            Map<String, Object> map = new HashMap<>();
            map.put("code", StatusEnum.SUCCESS);
            map.put("data", sysfiles);
            map.put("total", sysfiles.size());
            map.put("success", true);
            return map;
        } catch (Exception e) {
            Map<String, Object> map = new HashMap<>();
            map.put("code", StatusEnum.FAIL);
            map.put("success", false);
            map.put("message", e.getMessage());
            return map;
        }
    }


    @PutMapping("/updateFile")
    public Result updateFile(Integer fileId, String fileName, String originFileName, String updateTime) {

        // 创建文件对象
        File oldFile = new File(UPLOAD_DIR, originFileName);
        File newFile = new File(UPLOAD_DIR, fileName);

        // 尝试重命名文件
        boolean success = oldFile.renameTo(newFile);

        // 检查重命名是否成功
        if (success) {
            System.out.println("文件名修改成功");
            sysfileService.updateFile(fileId, fileName, updateTime);
            return ResultGenerator.getSuccessResult();
        } else {
            System.err.println("文件名修改失败");
            return ResultGenerator.getFailResult("文件名修改失败");
        }


    }


    @DeleteMapping("/deleteFile/{fileName}")
    public Result deleteFile(@PathVariable String fileName) {
        try {
            // 生成文件路径
            Path filePath = Paths.get(UPLOAD_DIR, fileName);
            // 删除文件
            Files.delete(filePath);
            System.out.println("删除文件成功！");
            // 这里可以调用相应的方法从数据库中删除文件记录
            sysfileService.deleteFile(fileName);
            return ResultGenerator.getSuccessResult();
        } catch (IOException e) {
            e.printStackTrace();
            System.out.println("删除文件失败！");
            return ResultGenerator.getFailResult("删除文件失败");
        }

    }

    @GetMapping("/getFilePath")
    public Result getFilePath(@RequestParam(value = "filename") String fileName) {
        String path = String.valueOf(Paths.get(UPLOAD_DIR, fileName));
        path = path.replace("\\", "/");
        return ResultGenerator.getSuccessResult((Object) path);
    }


//

}
