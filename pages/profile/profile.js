// pages/profile/profile.js
Page({
  data: {
    // 用户信息
    userInfo: null,
    loading: true,
    refreshing: false,

    // 统计图表数据
    readingStats: {
      booksRead: 0,
      challengesCompleted: 0,
      totalReadingTime: 0
    },

    // 近期活动
    recentActivities: [],

    // 成就预览（最多显示5个）
    achievementPreview: [],

    // 设置选项
    settings: {
      privacyLevel: 'high',
      notificationEnabled: true,
      showReadingStats: true,
      showAchievements: true
    }
  },

  onLoad() {
    this.loadUserProfile()
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadUserProfile()
  },

  onPullDownRefresh() {
    this.refreshProfile()
  },

  // 加载用户资料
  async loadUserProfile() {
    this.setData({ loading: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'checkAdmin'
      })

      if (res.result && res.result.success) {
        const { userInfo, role } = res.result

        if (role === 'guest') {
          // 未注册用户，跳转到注册页
          wx.redirectTo({
            url: '/pages/register/register'
          })
          return
        }

        // 更新用户信息
        this.setData({
          userInfo: userInfo,
          readingStats: userInfo.readingStats || {
            booksRead: 0,
            challengesCompleted: 0,
            totalReadingTime: 0
          },
          settings: userInfo.settings || this.data.settings,
          loading: false
        })

        // 加载成就预览
        this.loadAchievementPreview()

        // 加载近期活动
        this.loadRecentActivities()

      } else {
        this.showError('加载用户信息失败')
      }
    } catch (error) {
      console.error('加载用户资料失败:', error)
      this.showError('网络错误，请重试')
    }
  },

  // 刷新资料
  async refreshProfile() {
    this.setData({ refreshing: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'checkAdmin'
      })

      if (res.result && res.result.success) {
        const { userInfo } = res.result

        this.setData({
          userInfo: userInfo,
          readingStats: userInfo.readingStats || this.data.readingStats,
          refreshing: false
        })

        wx.showToast({
          title: '刷新成功',
          icon: 'success',
          duration: 1000
        })
      } else {
        this.showError('刷新失败')
      }
    } catch (error) {
      console.error('刷新资料失败:', error)
      this.showError('网络错误')
    } finally {
      wx.stopPullDownRefresh()
      this.setData({ refreshing: false })
    }
  },

  // 加载成就预览
  async loadAchievementPreview() {
    // 暂时使用模拟数据
    const mockAchievements = [
      { id: 'first_login', name: '初次见面', description: '第一次登录应用', icon: '🎉', unlocked: true },
      { id: 'book_reader', name: '小书虫', description: '阅读第一本书籍', icon: '📖', unlocked: true },
      { id: 'challenge_starter', name: '挑战者', description: '完成第一次阅读挑战', icon: '⚔️', unlocked: false },
      { id: 'reading_streak_3', name: '阅读小能手', description: '连续3天阅读', icon: '🔥', unlocked: false },
      { id: 'book_collector', name: '藏书家', description: '收藏10本书籍', icon: '🏆', unlocked: false }
    ]

    this.setData({
      achievementPreview: mockAchievements
    })
  },

  // 加载近期活动
  async loadRecentActivities() {
    // 暂时使用模拟数据
    const mockActivities = [
      { type: 'reading', title: '完成了《小王子》阅读', time: '2小时前', icon: '📚' },
      { type: 'challenge', title: '完成了本周阅读挑战', time: '1天前', icon: '⚔️' },
      { type: 'achievement', title: '解锁了"小书虫"成就', time: '2天前', icon: '🏅' },
      { type: 'book_added', title: '添加了《哈利波特》到书单', time: '3天前', icon: '➕' }
    ]

    this.setData({
      recentActivities: mockActivities
    })
  },

  // 跳转到成就页面
  goToAchievements() {
    wx.navigateTo({
      url: '/pages/achievements/achievements'
    })
  },

  // 跳转到排行榜
  goToRanking() {
    wx.navigateTo({
      url: '/pages/ranking/ranking'
    })
  },

  // 跳转到挑战列表
  goToChallenges() {
    wx.navigateTo({
      url: '/pages/challenge-list/challenge-list'
    })
  },

  // 跳转到设置页面（后续实现）
  goToSettings() {
    wx.showToast({
      title: '设置功能开发中',
      icon: 'none',
      duration: 1500
    })
  },

  // 编辑个人资料
  editProfile() {
    wx.showToast({
      title: '编辑功能开发中',
      icon: 'none',
      duration: 1500
    })
  },

  // 切换设置选项
  toggleSetting(e) {
    const settingKey = e.currentTarget.dataset.key
    const currentValue = this.data.settings[settingKey]

    if (typeof currentValue === 'boolean') {
      const newSettings = { ...this.data.settings }
      newSettings[settingKey] = !currentValue

      this.setData({
        settings: newSettings
      })

      wx.showToast({
        title: '设置已更新',
        icon: 'success',
        duration: 1000
      })
    }
  },

  // 显示错误
  showError(message) {
    wx.showToast({
      title: message,
      icon: 'error',
      duration: 2000
    })
    this.setData({ loading: false, refreshing: false })
    wx.stopPullDownRefresh()
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '我的阅读成长记录',
      path: '/pages/profile/profile',
      imageUrl: '/images/share-profile.jpg'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '记录我的阅读旅程',
      query: ''
    }
  }
})