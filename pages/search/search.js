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
        // 转换状态字段为布尔值
        const convertToBoolean = (value) => {
          if (value === null || value === undefined) return false
          if (typeof value === 'boolean') return value
          if (typeof value === 'number') return value !== 0
          if (typeof value === 'string') {
            const strVal = value.trim().toLowerCase()
            const trueValues = ['true', '1', '是', 'yes', 'y', 't', '已购买', '已阅读', '已精读', '有', '完成', '已']
            const falseValues = ['false', '0', '否', 'no', 'n', 'f', '未购买', '未阅读', '未精读', '无', '未完成', '未', '']
            if (trueValues.includes(strVal)) return true
            if (falseValues.includes(strVal)) return false
            return strVal.length > 0
          }
          return Boolean(value)
        }

        const convertedResults = (res.result.data || []).map(book => ({
          ...book,
          purchased: convertToBoolean(book.purchased),
          read: convertToBoolean(book.read),
          intensiveRead: convertToBoolean(book.intensiveRead)
        }))

        this.setData({
          results: convertedResults,
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