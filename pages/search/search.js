// pages/search/search.js
const SEARCH_HISTORY_KEY = 'search_history'
const MAX_HISTORY = 10

Page({
  data: {
    // 搜索相关
    keyword: '',
    results: [],
    total: 0,
    loading: false,
    hasMore: true,
    showResults: false,
    showSuggestions: false,
    autoFocus: true,

    // 分页
    page: 0,
    pageSize: 20,

    // 历史记录
    recentKeywords: [],

    // 高亮函数（用于WXML）
    highlightText: this.highlightText.bind(this)
  },

  onLoad() {
    // 加载搜索历史
    this.loadSearchHistory()
  },

  onShow() {
    // 页面显示时自动聚焦搜索框
    this.setData({ autoFocus: true })
  },

  // 加载搜索历史
  loadSearchHistory() {
    try {
      const history = wx.getStorageSync(SEARCH_HISTORY_KEY) || []
      this.setData({ recentKeywords: history })
    } catch (error) {
      console.error('加载搜索历史失败:', error)
    }
  },

  // 保存搜索历史
  saveSearchHistory(keyword) {
    if (!keyword.trim()) return

    try {
      let history = wx.getStorageSync(SEARCH_HISTORY_KEY) || []

      // 移除已存在的相同关键词
      history = history.filter(item => item !== keyword)

      // 添加到开头
      history.unshift(keyword)

      // 限制数量
      if (history.length > MAX_HISTORY) {
        history = history.slice(0, MAX_HISTORY)
      }

      wx.setStorageSync(SEARCH_HISTORY_KEY, history)
      this.setData({ recentKeywords: history })
    } catch (error) {
      console.error('保存搜索历史失败:', error)
    }
  },

  // 输入处理
  onInput(e) {
    const keyword = e.detail.value
    this.setData({
      keyword,
      showSuggestions: keyword.length > 0
    })
  },

  // 清除关键词
  clearKeyword() {
    this.setData({
      keyword: '',
      showSuggestions: false,
      showResults: false
    })
  },

  // 搜索
  async onSearch(e) {
    const keyword = this.data.keyword.trim()
    if (!keyword) {
      wx.showToast({
        title: '请输入搜索关键词',
        icon: 'none'
      })
      return
    }

    // 保存搜索历史
    this.saveSearchHistory(keyword)

    // 开始搜索
    this.setData({
      showSuggestions: false,
      showResults: true,
      loading: true
    })

    // 执行搜索
    await this.searchBooks(keyword, true)
  },

  // 使用关键词搜索
  searchWithKeyword(e) {
    const keyword = e.currentTarget.dataset.keyword
    this.setData({ keyword })
    this.onSearch()
  },

  // 搜索书籍
  async searchBooks(keyword, reset = false) {
    if (this.data.loading && reset) return

    this.setData({ loading: true })

    try {
      const page = reset ? 0 : this.data.page

      // 调用云函数搜索
      const res = await wx.cloud.callFunction({
        name: 'searchBooks',
        data: {
          keyword: keyword,
          page: page,
          pageSize: this.data.pageSize
        }
      })

      if (res.result && res.result.success) {
        const results = res.result.data
        const total = res.result.total
        const hasMore = res.result.hasMore

        this.setData({
          results: reset ? results : [...this.data.results, ...results],
          total,
          page: reset ? 1 : page + 1,
          hasMore,
          loading: false
        })
      } else {
        throw new Error(res.result.error || '搜索失败')
      }
    } catch (error) {
      console.error('搜索失败:', error)
      this.setData({ loading: false })

      // 显示模拟数据（开发阶段使用）
      if (reset) {
        this.setData({
          results: this.getMockResults(keyword),
          total: 3,
          hasMore: false,
          loading: false
        })
      }

      wx.showToast({
        title: '使用模拟数据',
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 获取模拟搜索结果（开发阶段使用）
  getMockResults(keyword) {
    return [
      {
        _id: '1',
        serial: 1,
        title: `《安徒生${keyword}》`,
        type: '童话',
        author: '安徒生',
        description: `包含《丑小鸭》、《卖火柴的小女孩》等经典${keyword}故事`,
        gradeLevel: '一至二年级',
        purchased: true,
        read: true,
        intensiveRead: false,
        cover: ''
      },
      {
        _id: '2',
        serial: 2,
        title: `《十万个为什么${keyword}版》`,
        type: '科普',
        author: '少年儿童出版社',
        description: `解答儿童常见${keyword}问题，培养科学兴趣`,
        gradeLevel: '三至四年级',
        purchased: true,
        read: false,
        intensiveRead: false,
        cover: ''
      },
      {
        _id: '3',
        serial: 3,
        title: `《${keyword}游记》青少版`,
        type: '古典文学',
        author: '吴承恩',
        description: `中国古典四大名著之一，适合青少年阅读的${keyword}版本`,
        gradeLevel: '五至六年级',
        purchased: true,
        read: true,
        intensiveRead: true,
        cover: ''
      }
    ]
  },

  // 加载更多
  loadMore() {
    if (!this.data.hasMore || this.data.loading) return
    this.searchBooks(this.data.keyword, false)
  },

  // 文本高亮函数
  highlightText(text, keyword) {
    if (!text || !keyword) return text

    const regex = new RegExp(`(${keyword})`, 'gi')
    return text.replace(regex, '<span class="highlight">$1</span>')
  },

  // 跳转到详情页
  goToDetail(e) {
    const bookId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${bookId}`
    })
  },

  // 清空历史记录
  clearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.removeStorageSync(SEARCH_HISTORY_KEY)
            this.setData({ recentKeywords: [] })
            wx.showToast({
              title: '已清空',
              icon: 'success'
            })
          } catch (error) {
            console.error('清空历史记录失败:', error)
          }
        }
      }
    })
  },

  // 分享功能
  onShareAppMessage() {
    const { keyword, total } = this.data

    return {
      title: `搜索"${keyword}" - 找到${total}本书籍`,
      path: `/pages/search/search?keyword=${encodeURIComponent(keyword)}`,
      imageUrl: '/images/share-cover.jpg'
    }
  }
})