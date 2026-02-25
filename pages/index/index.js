// pages/index/index.js
Page({
  data: {
    stats: {
      grade1: 0,
      grade2: 0,
      grade3: 0,
      unread: 0,
      purchased: 0,
      intensive: 0
    },
    loading: false
  },

  onLoad() {
    this.loadStatistics()
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadStatistics()
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadStatistics().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 加载统计数据
  async loadStatistics() {
    this.setData({ loading: true })

    try {
      // 调用云函数获取统计数据
      const res = await wx.cloud.callFunction({
        name: 'getCategoryStats'
      })

      if (res.result && res.result.success) {
        this.setData({
          stats: res.result.data
        })
      } else {
        console.error('获取统计数据失败:', res.result)
        this.showError('加载失败，请重试')
      }
    } catch (error) {
      console.error('调用云函数失败:', error)

      // 如果云函数调用失败，显示模拟数据（开发阶段使用）
      this.setData({
        stats: {
          grade1: 12,
          grade2: 18,
          grade3: 15,
          unread: 25,
          purchased: 32,
          intensive: 8
        }
      })

      wx.showToast({
        title: '使用模拟数据',
        icon: 'none',
        duration: 2000
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 显示错误提示
  showError(message) {
    wx.showToast({
      title: message,
      icon: 'error',
      duration: 2000
    })
  },

  // 跳转到列表页（按年级）
  goToList(e) {
    const grade = e.currentTarget.dataset.grade
    wx.navigateTo({
      url: `/pages/list/list?gradeLevel=${grade}&title=${grade}书籍`
    })
  },

  // 跳转到搜索页
  goToSearch() {
    wx.navigateTo({
      url: '/pages/search/search'
    })
  },

  // 跳转到未阅读书籍
  goToUnread() {
    wx.navigateTo({
      url: '/pages/list/list?read=false&title=未阅读书籍'
    })
  },

  // 跳转到已购买书籍
  goToPurchased() {
    wx.navigateTo({
      url: '/pages/list/list?purchased=true&title=已购买书籍'
    })
  },

  // 跳转到已精读书籍
  goToIntensive() {
    wx.navigateTo({
      url: '/pages/list/list?intensiveRead=true&title=已精读书籍'
    })
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '儿童阅读记录小助手',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.jpg'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '记录孩子的阅读成长',
      query: ''
    }
  }
})