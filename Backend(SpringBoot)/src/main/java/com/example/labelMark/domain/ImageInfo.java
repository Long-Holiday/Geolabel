package com.example.labelMark.domain;

public class ImageInfo {

    private String imgSrc;
    private String typeName;

    // 构造函数
    public ImageInfo(String imgSrc, String typeName) {
        this.imgSrc = imgSrc;
        this.typeName = typeName;
    }

    // Getter 和 Setter 方法
    public String getImgSrc() {
        return imgSrc;
    }

    public void setImgSrc(String imgSrc) {
        this.imgSrc = imgSrc;
    }

    public String getTypeName() {
        return typeName;
    }

    public void setTypeName(String typeName) {
        this.typeName = typeName;
    }
}
