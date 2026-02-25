// pages/list/list.js
const db = wx.cloud.database()
const _ = db.command

Page({
  data: {
    // 页面数据
    pageTitle: '书籍列表',
    books: [],
    total: 0,
    loading: false,
    hasMore: true,

    // 分页参数
    page: 0,
    pageSize: 20,

    // 筛选条件
    filters: {
      gradeLevel: null,
      purchased: null,
      read: null,
      intensiveRead: null
    },

    // 筛选标签
    filterTags: [],

    // 排序
    sortField: 'serial',
    sortOrder: 'asc',

    // 界面状态
    showFilterPanel: false,

    // 页面参数
    queryParams: {}
  },

  onLoad(options) {
    // 解析页面参数
    this.parseQueryParams(options)

    // 设置页面标题
    const title = options.title || '书籍列表'
    wx.setNavigationBarTitle({ title })

    // 更新分页大小（如果指定）
    const updates = {
      pageTitle: title,
      queryParams: options
    }
    if (options.pageSize) {
      updates.pageSize = parseInt(options.pageSize, 10) || 20
    }

    this.setData(updates)

    // 加载书籍列表
    this.loadBooks(true)
  },

  onPullDownRefresh() {
    // 下拉刷新
    this.loadBooks(true).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    // 上拉加载更多
    this.loadMore()
  },

  // 解析查询参数
  parseQueryParams(options) {
    const filters = {}

    if (options.gradeLevel) {
      filters.gradeLevel = options.gradeLevel
    }

    if (options.purchased !== undefined) {
      filters.purchased = options.purchased === 'true'
    }

    if (options.read !== undefined) {
      filters.read = options.read === 'true'
    }

    if (options.intensiveRead !== undefined) {
      filters.intensiveRead = options.intensiveRead === 'true'
    }

    this.setData({ filters })

    // 更新筛选标签
    this.updateFilterTags()
  },

  // 更新筛选标签
  updateFilterTags() {
    const { filters } = this.data
    const tags = []

    if (filters.gradeLevel) {
      tags.push({
        label: '年级',
        value: filters.gradeLevel,
        key: 'gradeLevel'
      })
    }

    if (filters.purchased !== null) {
      tags.push({
        label: '购买',
        value: filters.purchased ? '已购买' : '未购买',
        key: 'purchased'
      })
    }

    if (filters.read !== null) {
      tags.push({
        label: '阅读',
        value: filters.read ? '已阅读' : '未阅读',
        key: 'read'
      })
    }

    if (filters.intensiveRead !== null) {
      tags.push({
        label: '精读',
        value: filters.intensiveRead ? '已精读' : '未精读',
        key: 'intensiveRead'
      })
    }

    this.setData({ filterTags: tags })
  },

  // 加载书籍列表
  async loadBooks(reset = false) {
    if (this.data.loading) return

    this.setData({ loading: true })

    try {
      const page = reset ? 0 : this.data.page
      const { filters, sortField, sortOrder, pageSize } = this.data

      // 构建查询条件
      let query = db.collection('books')

      // 添加筛选条件
      if (filters.gradeLevel) {
        query = query.where({ gradeLevel: filters.gradeLevel })
      }

      if (filters.purchased !== null) {
        query = query.where({ purchased: filters.purchased })
      }

      if (filters.read !== null) {
        query = query.where({ read: filters.read })
      }

      if (filters.intensiveRead !== null) {
        query = query.where({ intensiveRead: filters.intensiveRead })
      }

      // 获取总数
      const countRes = await query.count()
      const total = countRes.total

      // 获取分页数据
      const dataRes = await query
        .orderBy(sortField, sortOrder)
        .skip(page * pageSize)
        .limit(pageSize)
        .get()

      const books = dataRes.data
      const hasMore = (page + 1) * pageSize < total

      // 更新数据
      this.setData({
        books: reset ? books : [...this.data.books, ...books],
        total,
        page: reset ? 1 : page + 1,
        hasMore,
        loading: false
      })
    } catch (error) {
      console.error('加载书籍失败:', error)
      this.setData({ loading: false })

      // 显示模拟数据（开发阶段使用）
      if (reset) {
        this.setData({
          books: this.getMockBooks(),
          total: 3,
          hasMore: false,
          loading: false
        })
      }

      wx.showToast({
        title: '加载失败，使用模拟数据',
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 获取模拟书籍数据（开发阶段使用）
  getMockBooks() {
    return [
      {
        _id: '1',
        serial: 1,
        title: '《安徒生童话》',
        type: '童话',
        author: '安徒生',
        description: '包含《丑小鸭》、《卖火柴的小女孩》等经典童话故事',
        gradeLevel: '一至二年级',
        purchased: true,
        read: true,
        intensiveRead: false,
        cover: ''
      },
      {
        _id: '2',
        serial: 2,
        title: '《十万个为什么》',
        type: '科普',
        author: '少年儿童出版社',
        description: '解答儿童常见科学问题，培养科学兴趣',
        gradeLevel: '三至四年级',
        purchased: true,
        read: false,
        intensiveRead: false,
        cover: ''
      },
      {
        _id: '3',
        serial: 3,
        title: '《西游记》青少版',
        type: '古典文学',
        author: '吴承恩',
        description: '中国古典四大名著之一，适合青少年阅读的版本',
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
    this.loadBooks(false)
  },

  // 显示筛选面板
  showFilterPanel() {
    this.setData({ showFilterPanel: true })
  },

  // 隐藏筛选面板
  hideFilterPanel() {
    this.setData({ showFilterPanel: false })
  },

  // 停止事件冒泡
  stopPropagation() {
    // 空函数，仅用于catchtap
  },

  // 设置年级筛选
  setGradeFilter(e) {
    const value = e.currentTarget.dataset.value
    const { filters } = this.data

    // 切换选中状态
    if (filters.gradeLevel === value) {
      filters.gradeLevel = null
    } else {
      filters.gradeLevel = value
    }

    this.setData({ filters })
  },

  // 切换购买状态筛选
  togglePurchased(e) {
    const value = e.detail.value
    const { filters } = this.data
    filters.purchased = value
    this.setData({ filters })
  },

  // 切换阅读状态筛选
  toggleRead(e) {
    const value = e.detail.value
    const { filters } = this.data
    filters.read = value
    this.setData({ filters })
  },

  // 切换精读状态筛选
  toggleIntensive(e) {
    const value = e.detail.value
    const { filters } = this.data
    filters.intensiveRead = value
    this.setData({ filters })
  },

  // 设置排序字段
  setSortField(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ sortField: field })
  },

  // 移除筛选标签
  removeFilter(e) {
    const index = e.currentTarget.dataset.index
    const { filterTags } = this.data
    const { filters } = this.data

    if (index >= 0 && index < filterTags.length) {
      const tag = filterTags[index]
      filters[tag.key] = null
    }

    this.setData({ filters })
    this.updateFilterTags()
    this.applyFilters()
  },

  // 清空所有筛选
  clearAllFilters() {
    this.setData({
      filters: {
        gradeLevel: null,
        purchased: null,
        read: null,
        intensiveRead: null
      }
    })

    this.updateFilterTags()
    this.applyFilters()
  },

  // 重置筛选
  resetFilters() {
    this.setData({
      filters: {
        gradeLevel: null,
        purchased: null,
        read: null,
        intensiveRead: null
      },
      sortField: 'serial',
      sortOrder: 'asc'
    })
  },

  // 应用筛选
  applyFilters() {
    this.hideFilterPanel()
    this.updateFilterTags()
    this.loadBooks(true)
  },

  // 跳转到详情页
  goToDetail(e) {
    const bookId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${bookId}`
    })
  },

  // 分享功能
  onShareAppMessage() {
    const { pageTitle, filterTags } = this.data
    let title = pageTitle

    if (filterTags.length > 0) {
      const tagText = filterTags.map(tag => `${tag.label}:${tag.value}`).join(' ')
      title = `${pageTitle} (${tagText})`
    }

    return {
      title: title,
      path: `/pages/list/list?${this.buildQueryString()}`,
      imageUrl: '/images/share-cover.jpg'
    }
  },

  // 构建查询字符串
  buildQueryString() {
    const { filters } = this.data
    const params = []

    if (filters.gradeLevel) {
      params.push(`gradeLevel=${filters.gradeLevel}`)
    }

    if (filters.purchased !== null) {
      params.push(`purchased=${filters.purchased}`)
    }

    if (filters.read !== null) {
      params.push(`read=${filters.read}`)
    }

    if (filters.intensiveRead !== null) {
      params.push(`intensiveRead=${filters.intensiveRead}`)
    }

    return params.join('&')
  }
})