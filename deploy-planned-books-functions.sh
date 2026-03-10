#!/bin/bash
# 部署云函数脚本（包含计划阅读书籍和数据库初始化）
# 使用前请确保已安装miniprogram-ci并配置好私钥

set -e  # 遇到错误退出

APPID="wxc2d712752b0caacc"
ENV="cloudbase-4gnknimqbe0440c9"
PRIVATE_KEY_PATH="./private.key"
PROJECT_PATH="."

echo "开始部署计划阅读书籍相关云函数..."

# 函数：部署单个云函数
deploy_function() {
    local function_name=$1
    local function_path=$2

    echo "正在部署云函数: $function_name"
    echo "路径: $function_path"

    miniprogram-ci cloud functions upload \
        --project-path "$PROJECT_PATH" \
        --private-key-path "$PRIVATE_KEY_PATH" \
        --appid "$APPID" \
        --env "$ENV" \
        --name "$function_name" \
        --path "$function_path" \
        --remote-npm-install

    echo "✅ $function_name 部署完成"
    echo ""
}

# 部署计划阅读书籍和相关云函数
deploy_function "addPlannedBook" "cloudfunctions/addPlannedBook"
deploy_function "getPlannedBooks" "cloudfunctions/getPlannedBooks"
deploy_function "initDatabase" "cloudfunctions/initDatabase"

echo "🎉 所有云函数部署完成！"
echo ""
echo "注意事项："
echo "1. 请确保私钥文件 private.key 存在且权限正确"
echo "2. 确保已安装 miniprogram-ci: npm install -g miniprogram-ci"
echo "3. 如有部署失败，请检查云函数名称是否在云开发控制台已存在"
echo ""
echo "如果需要部署其他云函数，请修改此脚本添加对应的函数名称和路径"