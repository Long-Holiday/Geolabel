#!/usr/bin/env python3
"""
React代码提取器 - 用于提取React项目中的.js和.jsx文件，同时跳过指定的文件夹

使用方法:
    python react_code_extractor.py [源目录] [输出文件] [要跳过的文件夹...]

示例:
    python react_code_extractor.py ./my-react-app ./extracted_code.txt node_modules build
"""

import os
import sys
import re
import datetime
from pathlib import Path


def extract_react_code(source_dir, output_file, skip_dirs):
    """
    从源目录中提取所有.js和.jsx文件，并将内容写入输出文件
    跳过指定的目录
    """
    # 将跳过的目录转为绝对路径模式，便于后续判断
    source_path = Path(source_dir).resolve()
    skip_dirs_abs = [str(source_path / skip_dir) for skip_dir in skip_dirs]
    
    # 计数器
    total_files = 0
    extracted_files = 0
    
    # 打开输出文件
    with open(output_file, 'w', encoding='utf-8') as out_f:        
        # 遍历源目录
        for root, dirs, files in os.walk(source_dir):
            # 检查当前目录是否应该被跳过
            current_path = os.path.abspath(root)
            skip_current = False
            
            for skip_dir in skip_dirs_abs:
                if current_path.startswith(skip_dir) or any(
                    part.startswith('.') for part in Path(current_path).parts
                ):
                    skip_current = True
                    break
            
            if skip_current:
                continue
                
            # 处理当前目录下的文件
            for file in files:
                if file.endswith(('.js', '.jsx')) and not file.endswith(('.test.js', '.spec.js', '.min.js')):
                    total_files += 1
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, source_dir)
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            
                        # 写入文件信息和内容到输出文件
                        out_f.write(f"\n\n{'=' * 80}\n")
                        out_f.write(f"文件名: {os.path.basename(file_path)}\n")
                        out_f.write(f"相对路径: {rel_path}\n")
                        out_f.write(f"{'=' * 80}\n\n")
                        out_f.write(content)
                        
                        extracted_files += 1
                        print(f"已提取: {rel_path}")
                    except Exception as e:
                        print(f"提取失败 {rel_path}: {str(e)}")
    
    # 打印结果统计
    print(f"\n提取完成!")
    print(f"总文件数: {total_files}")
    print(f"成功提取: {extracted_files}")
    print(f"输出文件: {output_file}")


def main():
    """主函数，处理命令行参数并调用提取函数"""
    
    # 获取参数
    source_dir = "/home/change/labelcode/RS-image-sample-labeling-system/Service"
    output_file = "output_Service.txt"
    skip_dirs = []
    
    # 默认跳过的文件夹
    default_skip = ['node_modules', 'build', 'dist', '.git', 'coverage']
    for d in default_skip:
        if d not in skip_dirs:
            skip_dirs.append(d)
    
    # 检查源目录是否存在
    if not os.path.isdir(source_dir):
        print(f"错误: 源目录 '{source_dir}' 不存在!")
        sys.exit(1)
    
    print(f"开始提取React代码...")
    print(f"源目录: {source_dir}")
    print(f"输出文件: {output_file}")
    print(f"跳过的文件夹: {', '.join(skip_dirs)}")
    
    # 调用提取函数
    extract_react_code(source_dir, output_file, skip_dirs)


if __name__ == "__main__":
    main()