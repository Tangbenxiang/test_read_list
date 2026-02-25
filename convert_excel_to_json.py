#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Excel转JSON转换脚本
用于将书籍Excel表格转换为小程序可导入的JSON格式

用法：
1. 安装依赖：pip install pandas openpyxl
2. 运行脚本：python convert_excel_to_json.py
"""

import pandas as pd
import json
import os
import sys
from datetime import datetime

def convert_excel_to_json(excel_file, json_file=None):
    """
    将Excel文件转换为JSON格式

    Args:
        excel_file: Excel文件路径
        json_file: 输出JSON文件路径（可选）

    Returns:
        转换后的数据列表
    """
    # 检查文件是否存在
    if not os.path.exists(excel_file):
        print(f"错误：文件不存在 - {excel_file}")
        return None

    try:
        # 读取Excel文件
        print(f"正在读取Excel文件: {excel_file}")
        df = pd.read_excel(excel_file)

        print(f"原始数据形状: {df.shape}")
        print(f"列名: {list(df.columns)}")

        # 标准化列名（处理可能的空格和大小写）
        column_mapping = {}
        for col in df.columns:
            col_lower = str(col).strip().lower()
            if '序号' in col_lower:
                column_mapping[col] = 'serial'
            elif '书名' in col_lower:
                column_mapping[col] = 'title'
            elif '书籍类型' in col_lower or '类型' in col_lower:
                column_mapping[col] = 'type'
            elif '作者' in col_lower:
                column_mapping[col] = 'author'
            elif '简介' in col_lower or '描述' in col_lower:
                column_mapping[col] = 'description'
            elif '适合年级' in col_lower or '年级' in col_lower:
                column_mapping[col] = 'gradeLevel'
            elif '是否购买' in col_lower or '购买' in col_lower:
                column_mapping[col] = 'purchased'
            elif '是否阅读' in col_lower or '阅读' in col_lower:
                column_mapping[col] = 'read'
            elif '是否精读' in col_lower or '精读' in col_lower:
                column_mapping[col] = 'intensiveRead'
            else:
                # 保留未知列
                column_mapping[col] = col

        # 重命名列
        df = df.rename(columns=column_mapping)
        print(f"重命名后的列名: {list(df.columns)}")

        # 确保必要字段存在
        required_fields = ['serial', 'title', 'type', 'author', 'gradeLevel']
        for field in required_fields:
            if field not in df.columns:
                print(f"警告：缺少必要字段 - {field}")

        # 处理布尔字段
        bool_fields = ['purchased', 'read', 'intensiveRead']
        for field in bool_fields:
            if field in df.columns:
                # 转换不同的布尔表示方式
                def convert_bool_value(x):
                    if pd.isna(x):
                        return False
                    if isinstance(x, (bool, int)):
                        return bool(x)
                    if isinstance(x, str):
                        x_lower = x.strip().lower()
                        if x_lower in ['1', '是', 'yes', 'true', 't', 'y', '已购买', '已阅读', '已精读']:
                            return True
                        elif x_lower in ['0', '', '否', 'no', 'false', 'f', 'n', '未购买', '未阅读', '未精读']:
                            return False
                    # 默认转换为布尔值
                    try:
                        return bool(x)
                    except:
                        return False

                df[field] = df[field].apply(convert_bool_value)
                print(f"字段 '{field}' 转换完成: {df[field].sum()} 个True")

        # 处理文本字段的空值
        text_fields = ['title', 'type', 'author', 'description', 'gradeLevel']
        for field in text_fields:
            if field in df.columns:
                df[field] = df[field].fillna('').astype(str).str.strip()

        # 处理数值字段
        if 'serial' in df.columns:
            df['serial'] = pd.to_numeric(df['serial'], errors='coerce').fillna(0).astype(int)

        # 构建JSON数据
        books = []
        for idx, row in df.iterrows():
            book = {}

            # 添加所有字段
            for col in df.columns:
                value = row[col]

                # 处理NaN值
                if pd.isna(value):
                    if col in bool_fields:
                        value = False
                    elif col in text_fields:
                        value = ''
                    elif col == 'serial':
                        value = idx + 1
                    else:
                        value = None

                # 添加到书籍对象
                if value is not None:
                    book[col] = value

            # 添加默认字段（如果不存在）
            if 'cover' not in book:
                book['cover'] = ''

            books.append(book)

        print(f"成功转换 {len(books)} 本书籍")

        # 生成输出文件名
        if json_file is None:
            base_name = os.path.splitext(excel_file)[0]
            json_file = f"{base_name}_converted.json"

        # 保存为JSON文件
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(books, f, ensure_ascii=False, indent=2)

        print(f"JSON文件已保存: {json_file}")
        print(f"文件大小: {os.path.getsize(json_file) / 1024:.2f} KB")

        # 显示示例数据
        if books:
            print("\n前3本书籍示例:")
            for i, book in enumerate(books[:3]):
                print(f"\n{i+1}. {book.get('title', '未知书名')}")
                print(f"   作者: {book.get('author', '未知')}")
                print(f"   类型: {book.get('type', '未知')}")
                print(f"   年级: {book.get('gradeLevel', '未知')}")
                print(f"   购买: {book.get('purchased', False)}")
                print(f"   阅读: {book.get('read', False)}")
                print(f"   精读: {book.get('intensiveRead', False)}")

        return books

    except Exception as e:
        print(f"转换过程中发生错误: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def main():
    """主函数"""
    print("=" * 60)
    print("Excel转JSON转换工具")
    print("=" * 60)

    # 检查参数
    if len(sys.argv) > 1:
        excel_file = sys.argv[1]
        json_file = sys.argv[2] if len(sys.argv) > 2 else None
    else:
        # 交互式输入
        excel_file = input("请输入Excel文件路径: ").strip()
        if not excel_file:
            # 使用默认文件
            excel_file = "books.xlsx"
            print(f"使用默认文件: {excel_file}")

        json_file = input("请输入输出JSON文件路径（直接回车使用默认）: ").strip()
        if not json_file:
            json_file = None

    # 检查文件扩展名
    if not excel_file.lower().endswith(('.xlsx', '.xls')):
        print("警告：文件扩展名不是.xlsx或.xls")
        confirm = input("是否继续？(y/n): ").strip().lower()
        if confirm != 'y':
            print("已取消转换")
            return

    # 执行转换
    books = convert_excel_to_json(excel_file, json_file)

    if books:
        print("\n" + "=" * 60)
        print("转换完成！")
        print("=" * 60)
        print("\n下一步：")
        print("1. 将生成的JSON文件导入云数据库")
        print("2. 在云开发控制台 -> 数据库 -> books集合")
        print("3. 点击'导入'按钮，选择JSON文件")
        print("4. 设置导入模式为'新增记录'")
        print("5. 点击'导入'开始批量导入")
    else:
        print("转换失败，请检查错误信息")

if __name__ == "__main__":
    main()