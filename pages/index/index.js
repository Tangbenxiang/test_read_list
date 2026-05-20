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
    loading: false,
    // 用户信息
    userInfo: null,
    // 计划阅读书籍
    plannedBooks: [],
    // 菜园状态（首页卡片）
    gardenStatus: null,
    gardenLoading: false
  },

  onLoad() {
    this.checkUserStatus()
    this.loadStatistics()
    this.loadPlannedBooks()
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadStatistics()
    this.loadPlannedBooks()
    this.loadGardenStatus()

    // 处理 switchTab 传递的 tab 标记（如来自挑战列表页）
    const app = getApp()
    if (app.globalData.pendingTab) {
      const tab = app.globalData.pendingTab
      delete app.globalData.pendingTab
      // 预留：挑战专区启用后可在此处理 tab 切换
      console.log('pendingTab:', tab)
    }
  },

  // 检查用户状态并跳转
  async checkUserStatus() {
    const app = getApp()

    // 优先使用全局用户信息
    if (app.globalData.userInfo && app.globalData.loginStatus === 'loggedIn') {
      this.setData({
        userInfo: app.globalData.userInfo
      })
      return
    }

    // 如果全局状态是guest，不跳转注册页（个人使用场景，所有访问者可见）
    if (app.globalData.loginStatus === 'guest') {
      console.log('游客状态，保持首页显示')
      // 不再跳转注册页，让游客也能查看首页内容
      return
    }

    // 否则调用云函数检查
    try {
      const res = await wx.cloud.callFunction({
        name: 'checkAdmin'
      })

      if (res.result && res.result.success) {
        const { role, userInfo } = res.result

        if (role === 'guest') {
          // 更新全局状态
          app.globalData.loginStatus = 'guest'
          // 未注册用户，不跳转注册页（个人使用场景，所有访问者可见）
          console.log('游客状态，保持首页显示')
          return
        }

        // 已注册用户，保存用户信息到全局和页面
        app.globalData.userInfo = userInfo
        app.globalData.loginStatus = 'loggedIn'
        this.setData({
          userInfo: userInfo
        })
      } else {
        console.error('用户状态检查失败:', res.result)
        // 失败时不跳转，让用户继续使用基本功能
      }
    } catch (error) {
      console.error('检查用户状态失败:', error)
      // 网络错误时不跳转，让用户继续使用
    }
  },

  // 加载菜园状态（首页卡片）
  async loadGardenStatus() {
    this.setData({ gardenLoading: true })
    try {
      const res = await wx.cloud.callFunction({ name: 'getStatus' })
      if (res.result && res.result.success) {
        this.setData({ gardenStatus: res.result.data, gardenLoading: false })
      } else {
        // 静默失败，不影响读书功能
        this.setData({ gardenStatus: null, gardenLoading: false })
      }
    } catch (err) {
      console.error('加载菜园状态失败:', err)
      this.setData({ gardenStatus: null, gardenLoading: false })
    }
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
    console.log('跳转到搜索页面')
    wx.navigateTo({
      url: '/pages/search/search'
    })
  },

  // 跳转到未阅读书籍
  goToUnread() {
    wx.navigateTo({
      url: '/pages/list/list?read=false&title=未阅读书籍&pageSize=100'
    })
  },

  // 跳转到未购买书籍
  goToPurchased() {
    wx.navigateTo({
      url: '/pages/list/list?purchased=false&title=未购买书籍&pageSize=100'
    })
  },

  // 跳转到已精读书籍
  goToIntensive() {
    wx.navigateTo({
      url: '/pages/list/list?intensiveRead=true&title=已精读书籍&pageSize=100'
    })
  },

  // 跳转到全部书籍
  goToAllBooks() {
    wx.navigateTo({
      url: '/pages/list/list?title=全部书籍&pageSize=100'
    })
  },

  // 跳转到意见建议页面
  goToFeedback() {
    wx.navigateTo({
      url: '/pages/feedback/feedback'
    })
  },

  // 跳转到菜园主页
  goToGarden() {
    wx.switchTab({
      url: '/pages/garden/index'
    })
  },

  // 跳转到添加书籍页面
  goToAddBook() {
    wx.navigateTo({
      url: '/pages/addbook/addbook'
    })
  },

  // 跳转到家长专区
  goToParentZone() {
    wx.showToast({
      title: '家长专区功能正在开发中，敬请期待！',
      icon: 'none',
      duration: 2000
    })
  },

  // 跳转到个人中心
  goToProfile() {
    if (this.data.userInfo) {
      wx.navigateTo({
        url: '/pages/profile/profile'
      })
    } else {
      wx.showToast({
        title: '正在加载用户信息...',
        icon: 'none',
        duration: 1000
      })
    }
  },

  // 跳转到挑战列表页面
  goToChallenge() {
    wx.navigateTo({
      url: '/pages/challenge-list/challenge-list'
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
  },

  // 加载计划阅读书籍
  async loadPlannedBooks() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getPlannedBooks'
      })

      if (res.result && res.result.success) {
        this.setData({
          plannedBooks: res.result.data
        })
      } else {
        console.error('获取计划阅读书籍失败:', res.result)
        // 显示模拟数据（个人使用场景）
        this.showPlannedBooksMockData()
      }
    } catch (error) {
      console.error('调用计划阅读书籍云函数失败:', error)
      // 显示模拟数据（个人使用场景）
      this.showPlannedBooksMockData()
    }
  },

  // 跳转到添加计划阅读书籍页面
  goToAddPlannedBook() {
    // 暂时使用现有的添加书籍页面，后续可以创建专门的添加计划书籍页面
    wx.navigateTo({
      url: '/pages/addbook/addbook?planned=true'
    })
  },

  // 更新计划阅读书籍状态
  async updatePlannedBookStatus(e) {
    console.log('updatePlannedBookStatus函数被调用，事件对象:', e)
    const { bookId } = e.currentTarget.dataset
    console.log('从dataset获取的参数 - bookId:', bookId)

    if (!bookId) {
      console.error('缺少bookId参数')
      return
    }

    // 提示用户去详情页管理计划阅读状态
    wx.showActionSheet({
      itemList: ['查看书籍详情'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 跳转到书籍详情页
          wx.navigateTo({
            url: `/pages/detail/detail?id=${bookId}`
          })
        }
      },
      fail: (err) => {
        console.log('用户取消操作')
      }
    })
  },

  // 查看计划阅读书籍详情
  viewPlannedBook(e) {
    const bookId = e.currentTarget.dataset.bookId
    if (bookId) {
      wx.navigateTo({
        url: `/pages/detail/detail?id=${bookId}`
      })
    }
  },

  // 显示计划阅读书籍模拟数据（个人使用场景）
  showPlannedBooksMockData() {
    const mockData = [
      {
        bookId: 'mock1',
        status: 'planned',
        bookInfo: {
          title: '小王子',
          author: '[法] 圣埃克苏佩里',
          cover: ''
        }
      },
      {
        bookId: 'mock2',
        status: 'reading',
        bookInfo: {
          title: '哈利·波特与魔法石',
          author: '[英] J.K.罗琳',
          cover: ''
        }
      },
      {
        bookId: 'mock3',
        status: 'completed',
        bookInfo: {
          title: '夏洛的网',
          author: '[美] E.B.怀特',
          cover: ''
        }
      }
    ]
    this.setData({
      plannedBooks: mockData
    })
    wx.showToast({
      title: '使用模拟数据',
      icon: 'none',
      duration: 2000
    })
  }
})