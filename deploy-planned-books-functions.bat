@echo off
REM 部署云函数脚本（Windows版，包含计划阅读书籍和数据库初始化）
REM 使用前请确保已安装miniprogram-ci并配置好私钥

set APPID=wxc2d712752b0caacc
set ENV=cloudbase-4gnknimqbe0440c9
set PRIVATE_KEY_PATH=./private.key
set PROJECT_PATH=.

echo 开始部署云函数...
echo.

REM 函数：部署单个云函数
call :deploy_function addPlannedBook cloudfunctions/addPlannedBook
call :deploy_function getPlannedBooks cloudfunctions/getPlannedBooks
call :deploy_function initDatabase cloudfunctions/initDatabase

echo.
echo 🎉 所有云函数部署完成！
echo.
echo 注意事项：
echo 1. 请确保私钥文件 private.key 存在且权限正确
echo 2. 确保已安装 miniprogram-ci: npm install -g miniprogram-ci
echo 3. 如有部署失败，请检查云函数名称是否在云开发控制台已存在
echo.
echo 如果需要部署其他云函数，请修改此脚本添加对应的函数名称和路径
goto :eof

:deploy_function
set FUNCTION_NAME=%1
set FUNCTION_PATH=%2
echo 正在部署云函数: %FUNCTION_NAME%
echo 路径: %FUNCTION_PATH%
echo.

miniprogram-ci cloud functions upload ^
    --project-path "%PROJECT_PATH%" ^
    --private-key-path "%PRIVATE_KEY_PATH%" ^
    --appid "%APPID%" ^
    --env "%ENV%" ^
    --name "%FUNCTION_NAME%" ^
    --path "%FUNCTION_PATH%" ^
    --remote-npm-install

echo ✅ %FUNCTION_NAME% 部署完成
echo.
exit /b 0