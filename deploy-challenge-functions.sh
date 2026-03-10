#!/bin/bash
# 部署challenge相关云函数脚本
# 使用前请确保已安装miniprogram-ci并配置好私钥

set -e  # 遇到错误退出

APPID="wxc2d712752b0caacc"
ENV="cloudbase-4gnknimqbe0440c9"
PRIVATE_KEY_PATH="./private.key"
PROJECT_PATH="."

echo "开始部署challenge相关云函数..."

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

# 部署五个challenge云函数
deploy_function "create" "cloudfunctions/challenge/create"
deploy_function "getDetail" "cloudfunctions/challenge/getDetail"
deploy_function "getHistory" "cloudfunctions/challenge/getHistory"
deploy_function "getWeekly" "cloudfunctions/challenge/getWeekly"
deploy_function "submit" "cloudfunctions/challenge/submit"

echo "🎉 所有challenge云函数部署完成！"
echo ""
echo "注意事项："
echo "1. 请确保私钥文件 private.key 存在且权限正确"
echo "2. 确保已安装 miniprogram-ci: npm install -g miniprogram-ci"
echo "3. 如有部署失败，请检查云函数名称是否在云开发控制台已存在"