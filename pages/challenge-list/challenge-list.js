// pages/challenge-list/challenge-list.js
const app = getApp()

Page({
  data: {
    // 数据
    weeklyGroups: [],
    allChallenges: [],

    // 筛选状态
    filterYear: null,
    filterStatus: 'ended',
    filterYearIndex: 0,
    filterStatusIndex: 0,
    currentPage: 1,
    pageSize: 10,
    hasMore: true,

    // UI状态
    isLoading: true,
    isRefreshing: false,
    errorMessage: '',
    showFilterPanel: false,

    // 统计数据
    totalChallenges: 0,
    completedChallenges: 0,
    completionRate: 0,
    averageScore: 0,

    // 年份选项
    years: [],
    statusOptions: [
      { label: '已结束', value: 'ended' },
      { label: '进行中', value: 'active' },
      { label: '未开始', value: 'upcoming' },
      { label: '全部', value: '' }
    ]
  },

  onLoad() {
    this.loadChallenges(true)
    this.generateYearOptions()
  },

  onPullDownRefresh() {
    this.refreshChallenges()
  },

  onReachBottom() {
    this.loadMoreChallenges()
  },

  // 生成年份选项
  generateYearOptions() {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let year = currentYear; year >= 2023; year--) {
      years.push(year)
    }
    this.setData({ years }, () => {
      this.updateFilterIndices()
    })
  },

  // 更新筛选器索引
  updateFilterIndices() {
    const { filterYear, filterStatus, years, statusOptions } = this.data

    // 计算年份索引
    let filterYearIndex = 0
    if (filterYear && years && years.length > 0) {
      const yearIndex = years.indexOf(filterYear)
      if (yearIndex !== -1) {
        filterYearIndex = yearIndex
      }
    }

    // 计算状态索引
    let filterStatusIndex = 0
    if (filterStatus && statusOptions && statusOptions.length > 0) {
      const statusIndex = statusOptions.findIndex(s => s.value === filterStatus)
      if (statusIndex !== -1) {
        filterStatusIndex = statusIndex
      }
    }

    this.setData({
      filterYearIndex,
      filterStatusIndex
    })
  },

  // 加载挑战数据
  async loadChallenges(isInitial = false) {
    if (isInitial) {
      this.setData({ isLoading: true, errorMessage: '' })
    }

    try {
      const result = await wx.cloud.callFunction({
        name: 'getHistory',
        data: {
          page: this.data.currentPage,
          pageSize: this.data.pageSize,
          status: this.data.filterStatus,
          year: this.data.filterYear,
          includeUserStatus: true
        }
      })

      if (result.result.success) {
        const { weeklyGroups, challenges, pagination } = result.result

        // 更新数据
        if (this.data.currentPage === 1) {
          this.setData({
            weeklyGroups: weeklyGroups || [],
            allChallenges: challenges || []
          })
        } else {
          this.setData({
            weeklyGroups: [...this.data.weeklyGroups, ...(weeklyGroups || [])],
            allChallenges: [...this.data.allChallenges, ...(challenges || [])]
          })
        }

        // 更新分页状态
        this.setData({
          hasMore: pagination?.hasMore || false,
          totalChallenges: pagination?.total || 0
        })

        // 计算统计数据
        this.calculateStats()

      } else {
        throw new Error(result.result.message || '加载失败')
      }

    } catch (error) {
      console.error('加载挑战列表失败:', error)
      this.setData({
        errorMessage: '加载失败: ' + (error.message || '未知错误')
      })

      if (isInitial) {
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        })
      }
    } finally {
      this.setData({
        isLoading: false,
        isRefreshing: false
      })
      wx.stopPullDownRefresh()
    }
  },

  // 刷新数据
  refreshChallenges() {
    this.setData({
      currentPage: 1,
      isRefreshing: true
    })
    this.loadChallenges()
  },

  // 加载更多
  loadMoreChallenges() {
    if (!this.data.hasMore || this.data.isLoading) return

    this.setData({
      currentPage: this.data.currentPage + 1
    })
    this.loadChallenges(false)
  },

  // 计算统计数据
  calculateStats() {
    const allChallenges = this.data.allChallenges
    const total = allChallenges.length
    const completed = allChallenges.filter(c => c.userStatus?.submitted).length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    // 计算平均分
    const submittedChallenges = allChallenges.filter(
      c => c.userStatus?.submitted && c.userStatus?.totalScore !== undefined
    )
    const averageScore = submittedChallenges.length > 0
      ? Math.round(submittedChallenges.reduce((sum, c) => sum + c.userStatus.totalScore, 0) / submittedChallenges.length)
      : 0

    this.setData({
      completedChallenges: completed,
      completionRate: completionRate,
      averageScore: averageScore
    })
  },

  // 筛选操作
  onFilterYearChange(e) {
    const index = e.detail.value
    const years = this.data.years
    const year = years[index] || null

    this.setData({
      filterYear: year,
      filterYearIndex: index,
      currentPage: 1
    }, () => {
      this.loadChallenges(true)
    })
  },

  onFilterStatusChange(e) {
    const index = e.detail.value
    const statusOptions = this.data.statusOptions
    const status = statusOptions[index] ? statusOptions[index].value : ''

    this.setData({
      filterStatus: status,
      filterStatusIndex: index,
      currentPage: 1
    }, () => {
      this.loadChallenges(true)
    })
  },

  toggleFilterPanel() {
    this.setData({
      showFilterPanel: !this.data.showFilterPanel
    })
  },

  // 跳转到挑战详情
  navigateToChallenge(e) {
    const { challengeId } = e.currentTarget.dataset
    if (challengeId) {
      wx.navigateTo({
        url: `/pages/challenge/challenge?challengeId=${challengeId}`
      })
    }
  },

  // 查看本周挑战
  viewWeeklyChallenges() {
    wx.navigateTo({
      url: '/pages/index/index?tab=challenges'
    })
  },

  // 显示挑战详情
  showChallengeInfo(e) {
    const { challenge } = e.currentTarget.dataset
    if (challenge) {
      const content = `
标题：${challenge.title}
书籍：${challenge.bookInfo?.title || '未知'}
难度：${challenge.difficulty === 'easy' ? '简单' : challenge.difficulty === 'medium' ? '中等' : '困难'}
题数：${challenge.totalQuestions}题
积分：${challenge.totalPoints}分
状态：${challenge.status === 'active' ? '进行中' : challenge.status === 'upcoming' ? '未开始' : '已结束'}
完成状态：${challenge.userStatus?.submitted ? `已提交 (得分: ${challenge.userStatus.totalScore}%)` : '未完成'}
      `.trim()

      wx.showModal({
        title: '挑战详情',
        content: content,
        showCancel: false,
        confirmText: '知道了'
      })
    }
  },

  // 返回首页
  backToHome() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  }
})