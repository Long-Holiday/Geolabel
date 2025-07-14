package com.example.labelMark.utils;

import java.awt.*;
import java.awt.geom.Path2D;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import javax.imageio.ImageIO;
public class GenerateStuffImg {

    public static void generateStuffImg(int width, int height, List<Map<String, Object>> pixelArr, String outputPath) throws IOException {
        // 创建一个新的BufferedImage对象
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g2d = image.createGraphics();

        // 设置填充颜色为黑色并绘制矩形
        g2d.setColor(Color.BLACK);
        g2d.fillRect(0, 0, width, height);

        // 遍历像素数组
        for (Map<String, Object> pixelData : pixelArr) {
            // Java 无法确保 Object 是一个 List<Double>。因此，强制类型转换是“不安全的”，并且编译器会发出警告。
            List<Double> segmentation = (List<Double>) pixelData.get("segmentation");
            String typeColor = (String) pixelData.get("type_color");

            // 将颜色转换为Color对象
            Color color = Color.decode(typeColor);

            // 创建路径
            Path2D path = new Path2D.Double();
            if (segmentation != null && segmentation.size() > 1) {
                path.moveTo(segmentation.get(0), segmentation.get(1));

                for (int i = 2; i < segmentation.size(); i += 2) {
                    path.lineTo(segmentation.get(i), segmentation.get(i + 1));
                }

                path.closePath();

                // 绘制路径
                g2d.setColor(color);
                g2d.fill(path);
            }
        }

        // 释放图形上下文
        g2d.dispose();

        // 将BufferedImage写入到文件
        File file = new File(outputPath);
        ImageIO.write(image, "png", file);

        System.out.println("Output PNG written to " + outputPath);
    }
}