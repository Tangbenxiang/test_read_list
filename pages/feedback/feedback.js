// pages/feedback/feedback.js
const db = wx.cloud.database()

Page({
  data: {
    feedbackContent: '',
    submitting: false,
    characterCount: 0,
    maxLength: 500
  },

  onLoad() {
    // 页面加载时初始化
  },

  // 输入内容变化
  onInputChange(e) {
    const content = e.detail.value
    this.setData({
      feedbackContent: content,
      characterCount: content.length
    })
  },

  // 提交反馈
  async submitFeedback() {
    const { feedbackContent, submitting } = this.data

    // 验证输入
    if (!feedbackContent.trim()) {
      wx.showToast({
        title: '请输入意见和建议',
        icon: 'none',
        duration: 2000
      })
      return
    }

    if (feedbackContent.length > this.data.maxLength) {
      wx.showToast({
        title: `内容不能超过${this.data.maxLength}字`,
        icon: 'none',
        duration: 2000
      })
      return
    }

    if (submitting) return

    this.setData({ submitting: true })

    wx.showLoading({
      title: '提交中...',
      mask: true
    })

    try {
      // 获取用户信息
      const userInfo = await this.getUserInfo()

      // 提交到云数据库
      const result = await db.collection('feedback').add({
        data: {
          content: feedbackContent.trim(),
          userInfo: userInfo,
          createTime: db.serverDate(),
          status: 'pending', // pending, reviewed, resolved
          contact: userInfo.nickName || '匿名用户'
        }
      })

      wx.hideLoading()

      if (result._id) {
        wx.showToast({
          title: '提交成功',
          icon: 'success',
          duration: 2000
        })

        // 清空表单
        this.setData({
          feedbackContent: '',
          characterCount: 0
        })

        // 延迟返回上一页
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        throw new Error('提交失败')
      }
    } catch (error) {
      console.error('提交反馈失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '提交失败，请重试',
        icon: 'error',
        duration: 2000
      })
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 获取用户信息
  async getUserInfo() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于记录反馈信息',
        success: (res) => {
          resolve({
            nickName: res.userInfo.nickName,
            avatarUrl: res.userInfo.avatarUrl,
            gender: res.userInfo.gender,
            country: res.userInfo.country,
            province: res.userInfo.province,
            city: res.userInfo.city
          })
        },
        fail: (error) => {
          console.warn('获取用户信息失败:', error)
          // 返回默认信息
          resolve({
            nickName: '匿名用户',
            avatarUrl: '',
            gender: 0,
            country: '',
            province: '',
            city: ''
          })
        }
      })
    })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 页面分享
  onShareAppMessage() {
    return {
      title: '儿童阅读记录 - 意见建议',
      path: '/pages/feedback/feedback'
    }
  }
})