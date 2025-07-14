package com.example.labelMark.controller;

import com.example.labelMark.vo.constant.Result;
import org.apache.commons.io.IOUtils;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/img")
public class imgController {

    private static final String SERVERDOWNLOAD_DIR = "src/main/java/com/example/labelMark/resource/server_temp";

    private static final String SAMPLEDOWNLOAD_DIR = "src/main/java/com/example/labelMark/resource/dataset_temp";

    private InputStream getImgInputStream(String basePath, String fileName) throws FileNotFoundException {
        // 给文件名加上扩展名".png"
        Path filePath = Paths.get(basePath,fileName + ".png");
        return new FileInputStream(new File(String.valueOf(filePath)));
    }


    @GetMapping(value = "/getServerImg",
                produces = {MediaType.IMAGE_JPEG_VALUE, MediaType.IMAGE_PNG_VALUE})
    @ResponseBody
    public byte[] getServerImg(String img) throws IOException {
        // 检查文件扩展名是否为".png"
//        if (!img.toLowerCase().endsWith(".png")) {
//            throw new IllegalArgumentException("Invalid image format. Only PNG images are supported.");
//        }

        final InputStream in = getImgInputStream(SERVERDOWNLOAD_DIR, img);
        return IOUtils.toByteArray(in);
    }

    @GetMapping(value = "/getSampleImg",
            produces = {MediaType.IMAGE_JPEG_VALUE, MediaType.IMAGE_PNG_VALUE})
    @ResponseBody
    public byte[] getSampleImg(String img) throws IOException {

        final InputStream in = getImgInputStream(SAMPLEDOWNLOAD_DIR, img);
        return IOUtils.toByteArray(in);
    }



}



