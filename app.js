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

    // 检查登录状态
    this.checkLogin()
  },

  globalData: {
    systemInfo: null,
    userInfo: null,
    loginStatus: 'checking', // checking, loggedIn, guest, error
    openid: null
  },

  // 检查登录状态
  async checkLogin() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'checkAdmin'
      })

      if (res.result && res.result.success) {
        const { role, userInfo, openid } = res.result

        this.globalData.userInfo = userInfo
        this.globalData.loginStatus = role === 'guest' ? 'guest' : 'loggedIn'
        this.globalData.openid = openid

        console.log('登录状态检查成功:', role, userInfo ? '有用户信息' : '无用户信息')
      } else {
        this.globalData.loginStatus = 'error'
        console.error('登录状态检查失败:', res.result)
      }
    } catch (error) {
      this.globalData.loginStatus = 'error'
      console.error('检查登录状态失败:', error)
    }
  },

  // 刷新用户信息
  async refreshUserInfo() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'checkAdmin'
      })

      if (res.result && res.result.success) {
        const { role, userInfo, openid } = res.result

        this.globalData.userInfo = userInfo
        this.globalData.loginStatus = role === 'guest' ? 'guest' : 'loggedIn'
        this.globalData.openid = openid

        console.log('用户信息刷新成功')
        return true
      } else {
        console.error('用户信息刷新失败:', res.result)
        return false
      }
    } catch (error) {
      console.error('刷新用户信息失败:', error)
      return false
    }
  }
})