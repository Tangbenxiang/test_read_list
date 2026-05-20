// pages/garden/tasks.js
// 任务大厅 — 本周必选/选做任务列表 + 认领功能
Page({
  data: {
    health_point: 0,
    health_color: '#43A047',
    week_no: 1,
    requiredTasks: [],
    optionalTasks: [],
    loading: true,
    error: false,
    // 任务详情弹窗
    showDetail: false,
    detailTask: null,
    claiming: false
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadData() {
    this.setData({ loading: true, error: false })
    try {
      // 并行请求状态和任务
      const [statusRes, tasksRes] = await Promise.all([
        wx.cloud.callFunction({ name: 'getStatus' }),
        wx.cloud.callFunction({ name: 'getTasks' })
      ])

      const status = (statusRes.result && statusRes.result.success)
        ? statusRes.result.data
        : null

      const taskData = (tasksRes.result && tasksRes.result.success)
        ? tasksRes.result.data
        : null

      const allTasks = taskData ? taskData.tasks : []
      const requiredTasks = allTasks.filter(t => t.type === 'required')
      const optionalTasks = allTasks.filter(t => t.type !== 'required')

      this.setData({
        health_point: status ? status.health_point : 0,
        health_color: status ? status.health_color : '#43A047',
        week_no: taskData ? taskData.week_no : 1,
        requiredTasks,
        optionalTasks,
        loading: false
      })
    } catch (err) {
      console.error('加载任务列表失败:', err)
      this.setData({ loading: false, error: true })
    }
  },

  retry() {
    this.loadData()
  },

  // 认领任务
  async claimTask(e) {
    const { taskId } = e.currentTarget.dataset
    if (!taskId || this.data.claiming) return

    this.setData({ claiming: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'claimTask',
        data: { task_id: taskId }
      })

      if (res.result && res.result.success) {
        wx.showToast({
          title: '认领成功！记得去完成哦 🌱',
          icon: 'none',
          duration: 2000
        })
        // 刷新列表
        this.loadData()
      } else {
        const code = res.result ? res.result.code : ''
        this.showClaimError(code)
      }
    } catch (err) {
      console.error('认领失败:', err)
      wx.showToast({ title: '认领失败，请重试', icon: 'none' })
    } finally {
      this.setData({ claiming: false })
    }
  },

  // 根据错误码显示提示
  showClaimError(code) {
    const messages = {
      ALREADY_CLAIMED: '你已经认领过了',
      CLAIM_LIMIT_REACHED: '名额已满，感谢其他家庭！',
      TASK_EXPIRED: '任务已过期',
      TASK_CLOSED: '任务已关闭',
      TASK_NOT_FOUND: '任务不存在',
      USER_NOT_FOUND: '请先完成注册'
    }
    wx.showToast({
      title: messages[code] || '认领失败，请重试',
      icon: 'none',
      duration: 2000
    })
  },

  // 打开任务详情
  openDetail(e) {
    const { taskId, taskType } = e.currentTarget.dataset
    const list = taskType === 'required' ? this.data.requiredTasks : this.data.optionalTasks
    const task = list.find(t => t._id === taskId)
    if (!task) return

    this.setData({
      showDetail: true,
      detailTask: task
    })
  },

  // 关闭详情弹窗
  closeDetail() {
    this.setData({ showDetail: false, detailTask: null })
  },

  // 阻止弹窗内部点击冒泡
  preventBubble() {},

  // 跳转我的任务
  goToMyTasks() {
    wx.navigateTo({ url: '/pages/garden/my-tasks' })
  },

  // 格式化截止时间
  formatDeadline(deadline) {
    if (!deadline) return ''
    const d = new Date(deadline)
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
})
