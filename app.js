// app.js - 小程序入口文件
App({
  onLaunch: function () {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        // 环境ID，需要在小程序管理后台获取
        env: 'cloudbase-4gnknimqbe0440c9', // 开发环境ID，实际使用时需要替换
        traceUser: true, // 记录用户访问
      })
    }

    // 获取系统信息，用于适配
    wx.getSystemInfo({
      success: res => {
        this.globalData.systemInfo = res
      }
    })
  },

  globalData: {
    systemInfo: null,
    userInfo: null
  }
})