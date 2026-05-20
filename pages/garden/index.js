// pages/garden/index.js
// 菜园主页 — 健康值展示 + 本周任务卡片 + 相册入口
Page({
  data: {
    gardenStatus: null,
    tasks: [],
    photos: [],
    loading: true,
    error: false,
    isAdmin: false
  },

  onLoad() {
    this.checkAdmin()
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  checkAdmin() {
    try {
      const app = getApp()
      const role = app.globalData.userInfo && app.globalData.userInfo.role
      this.setData({ isAdmin: role === 'admin' || role === 'teacher' })
    } catch (err) {
      // 忽略
    }
  },

  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadData() {
    this.setData({ loading: true, error: false })
    try {
      // 并行请求菜园状态和任务列表
      const [statusRes, tasksRes] = await Promise.all([
        wx.cloud.callFunction({ name: 'getStatus' }),
        wx.cloud.callFunction({ name: 'getTasks' })
      ])

      const gardenStatus = (statusRes.result && statusRes.result.success)
        ? statusRes.result.data
        : null

      const taskData = (tasksRes.result && tasksRes.result.success)
        ? tasksRes.result.data
        : null

      // 只取前3个任务用于首页展示
      const tasks = taskData ? taskData.tasks.slice(0, 3) : []

      console.log('菜园数据加载完成:', gardenStatus ? '有状态数据' : '无状态数据', tasks.length + '个任务')

      this.setData({
        gardenStatus,
        tasks,
        loading: false
      })
    } catch (err) {
      console.error('加载菜园数据失败:', err)
      this.setData({ loading: false, error: true })
    }
  },

  // 重试加载
  retry() {
    this.loadData()
  },

  // 跳转任务大厅
  goToTasks() {
    wx.navigateTo({ url: '/pages/garden/tasks' })
  },

  // 跳转我的任务
  goToMyTasks() {
    wx.navigateTo({ url: '/pages/garden/my-tasks' })
  },

  // 跳转成长相册
  goToPhotos() {
    wx.navigateTo({ url: '/pages/garden/photos' })
  },

  // 跳转管理后台
  goToAdmin() {
    wx.navigateTo({ url: '/pages/garden/admin/admin' })
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '我们班的菜园 🌱',
      path: '/pages/garden/index'
    }
  }
})
