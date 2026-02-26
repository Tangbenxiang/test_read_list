// pages/search/search.js - 简化版
Page({
  data: {
    // 搜索相关
    keyword: '',
    results: [],
    loading: false
  },

  onLoad() {
    // 页面加载时不需要特殊处理
  },

  // 输入处理
  onInput(e) {
    this.setData({
      keyword: e.detail.value
    })
  },

  // 搜索
  async onSearch() {
    const keyword = this.data.keyword.trim()
    if (!keyword) {
      wx.showToast({
        title: '请输入搜索关键词',
        icon: 'none'
      })
      return
    }

    this.setData({ loading: true })

    try {
      // 调用云函数搜索
      const res = await wx.cloud.callFunction({
        name: 'searchBooks',
        data: {
          keyword: keyword,
          page: 0,
          pageSize: 20
        }
      })

      if (res.result && res.result.success) {
        this.setData({
          results: res.result.data || [],
          loading: false
        })

        if (res.result.data.length === 0) {
          wx.showToast({
            title: '未找到相关书籍',
            icon: 'none'
          })
        }
      } else {
        wx.showToast({
          title: '搜索失败',
          icon: 'error'
        })
        this.setData({ loading: false })
      }
    } catch (error) {
      console.error('搜索失败:', error)
      wx.showToast({
        title: '搜索失败',
        icon: 'error'
      })
      this.setData({ loading: false })
    }
  },

  // 跳转到详情页
  goToDetail(e) {
    const bookId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${bookId}`
    })
  }
})