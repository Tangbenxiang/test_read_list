#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
用户JSON数据转换脚本
将用户提供的书籍JSON转换为小程序可导入格式

用法：
1. 将用户提供的JSON文件保存为 books_import.json
2. 运行脚本：python convert_user_json.py
3. 生成的转换文件为 books_converted.json
4. 在云开发控制台导入生成的JSON文件
"""

import json
import os
import sys

def convert_user_json(input_file, output_file=None):
    """
    转换用户JSON数据为小程序格式

    Args:
        input_file: 用户提供的JSON文件路径
        output_file: 输出文件路径（可选）

    Returns:
        转换后的数据列表
    """
    if not os.path.exists(input_file):
        print(f"错误：文件不存在 - {input_file}")
        return None

    try:
        # 读取用户JSON数据
        print(f"正在读取文件: {input_file}")
        with open(input_file, 'r', encoding='utf-8') as f:
            user_data = json.load(f)

        print(f"找到 {len(user_data)} 本书籍")

        # 转换数据
        converted_books = []
        for book in user_data:
            # 字段映射
            converted = {
                "serial": book.get("seq", 0),
                "title": book.get("title", ""),
                "type": book.get("category", ""),
                "author": book.get("author", ""),
                "description": book.get("intro", ""),
                "gradeLevel": book.get("grade", ""),
                "purchased": book.get("purchased", False),
                "read": book.get("read", False),
                "intensiveRead": book.get("deepRead", False),
                "cover": "",
                # 创建时间和更新时间会在导入时自动生成
            }

            # 修正第11本书的标题（哈里波特 -> 哈利波特）
            if converted["serial"] == 11 and "哈里波特" in converted["title"]:
                converted["title"] = converted["title"].replace("哈里波特", "哈利波特")
                print(f"修正第11本书标题: {converted['title']}")

            # 验证必要字段
            if not converted["title"]:
                print(f"警告：第{converted['serial']}本书缺少书名")

            if not converted["gradeLevel"]:
                print(f"警告：第{converted['serial']}本书缺少年级信息")

            # 添加到转换列表
            converted_books.append(converted)

        # 生成输出文件名
        if output_file is None:
            base_name = os.path.splitext(input_file)[0]
            output_file = f"{base_name}_converted.json"

        # 保存为JSON文件
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(converted_books, f, ensure_ascii=False, indent=2)

        print(f"转换完成！共转换 {len(converted_books)} 本书籍")
        print(f"输出文件: {output_file}")
        print(f"文件大小: {os.path.getsize(output_file) / 1024:.2f} KB")

        # 显示示例
        if converted_books:
            print("\n前3本书籍转换示例:")
            for i, book in enumerate(converted_books[:3]):
                print(f"\n{i+1}. {book['title']}")
                print(f"   序号: {book['serial']}")
                print(f"   年级: {book['gradeLevel']}")
                print(f"   类型: {book['type']}")
                print(f"   作者: {book['author']}")
                print(f"   购买: {book['purchased']}")
                print(f"   阅读: {book['read']}")
                print(f"   精读: {book['intensiveRead']}")

        return converted_books

    except Exception as e:
        print(f"转换过程中发生错误: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def main():
    """主函数"""
    print("=" * 60)
    print("用户JSON数据转换工具")
    print("=" * 60)

    # 检查参数
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
        output_file = sys.argv[2] if len(sys.argv) > 2 else None
    else:
        # 交互式输入
        input_file = input("请输入用户JSON文件路径: ").strip()
        if not input_file:
            # 尝试默认路径
            default_path = "books_import.json"
            if os.path.exists(default_path):
                input_file = default_path
                print(f"使用默认文件: {input_file}")
            else:
                print("错误：未提供文件路径且默认文件不存在")
                return

        output_file = input("请输入输出文件路径（直接回车使用默认）: ").strip()
        if not output_file:
            output_file = None

    # 执行转换
    result = convert_user_json(input_file, output_file)

    if result:
        print("\n" + "=" * 60)
        print("转换完成！")
        print("=" * 60)
        print("\n导入方法（选择其一）:")
        print("\n方法一：通过云控制台导入")
        print("1. 进入微信开发者工具 → 云开发控制台 → 数据库 → books集合")
        print("2. 点击'导入'按钮")
        print("3. 选择生成的JSON文件（books_import_converted.json）")
        print("4. 设置导入模式为'新增记录'")
        print("5. 点击'导入'开始批量导入")

        print("\n方法二：通过云函数导入（推荐）")
        print("1. 上传 importTestBooks 云函数")
        print("2. 在小程序代码中调用:")
        print("""
wx.cloud.callFunction({
  name: 'importTestBooks',
  success: res => console.log('导入成功:', res),
  fail: err => console.error('导入失败:', err)
})""")
        print("3. 查看控制台输出确认导入结果")

        print("\n方法三：在云函数控制台测试")
        print("1. 进入云开发控制台 → 云函数")
        print("2. 找到 importTestBooks 函数")
        print("3. 点击'测试'按钮")
        print("4. 查看运行结果")
    else:
        print("转换失败，请检查错误信息")

if __name__ == "__main__":
    main()