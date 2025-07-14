import os
import glob

def convert_java_to_text(project_path, output_file):
    """
    将项目中的所有 Java 文件转换为文本（保留全部内容）并写入一个文件。
    注明每个 Java 文件的名称及相对于项目根目录的相对路径。
    """

    with open(output_file, 'w', encoding='utf-8') as outfile:
        for java_file in glob.glob(os.path.join(project_path, '**/*.py'), recursive=True):
            try:
                with open(java_file, 'r', encoding='utf-8') as infile:
                    code = infile.read()

                    # 计算相对于项目根目录的相对路径
                    relative_path = os.path.relpath(java_file, project_path)

                    # 获取文件名（不含路径）
                    file_name = os.path.basename(java_file)

                    outfile.write(f"// File Name: {file_name}\n")  # 文件名
                    outfile.write(f"// Relative Path: {relative_path}\n")  # 相对路径
                    outfile.write(code)
                    outfile.write("\n\n")  # 添加空行分隔
            except UnicodeDecodeError:
                print(f"Error decoding file: {java_file}.  Skipping.")
            except Exception as e:
                print(f"Error processing file: {java_file}. Error: {e}")

# 使用示例
project_directory = "/home/change/labelcode/FastAPI_DL"  # 替换为你的项目路径
output_text_file = "output_python.txt"  # 输出文件名
convert_java_to_text(project_directory, output_text_file)

print(f"Java files converted to text and saved to: {output_text_file}")