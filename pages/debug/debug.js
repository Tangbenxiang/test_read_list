Page({
  data: {
    openid: '',
    isAdmin: false,
    loading: false
  },

  onLoad() {
    this.getUserInfo()
  },

  // 获取用户信息
  async getUserInfo() {
    wx.showLoading({ title: '获取中...' })
    try {
      const res = await wx.cloud.callFunction({
        name: 'checkAdmin'
      })
      console.log('checkAdmin返回:', res.result)

      this.setData({
        openid: res.result.openid || '',
        isAdmin: res.result.isAdmin || false
      })

      wx.hideLoading()
    } catch (error) {
      console.error('获取用户信息失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '获取失败',
        icon: 'error'
      })
    }
  },

  // 添加为管理员
  async addAdmin() {
    if (this.data.loading || this.data.isAdmin) return

    wx.showLoading({ title: '添加中...' })
    this.setData({ loading: true })

    try {
      // 获取当前openid（再次确认）
      const checkRes = await wx.cloud.callFunction({
        name: 'checkAdmin'
      })

      const openid = checkRes.result.openid
      if (!openid) {
        throw new Error('无法获取openid')
      }

      // 添加到admins集合
      const db = wx.cloud.database()
      const addRes = await db.collection('admins').add({
        data: {
          openid: openid,
          role: 'admin',
          nickname: '管理员',
          createTime: db.serverDate()
        }
      })

      if (addRes._id) {
        this.setData({ isAdmin: true })
        wx.showToast({
          title: '添加成功！',
          icon: 'success',
          duration: 2000
        })

        // 3秒后返回
        setTimeout(() => {
          wx.navigateBack()
        }, 3000)
      }
    } catch (error) {
      console.error('添加管理员失败:', error)
      wx.showToast({
        title: '添加失败',
        icon: 'error',
        duration: 2000
      })
    } finally {
      this.setData({ loading: false })
      wx.hideLoading()
    }
  },

  // 复制openid
  copyOpenid() {
    wx.setClipboardData({
      data: this.data.openid,
      success: () => {
        wx.showToast({
          title: '已复制',
          icon: 'success'
        })
      }
    })
  },

  // 返回
  goBack() {
    wx.navigateBack()
  }
})