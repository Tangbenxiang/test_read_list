// pages/garden/admin/admin.js
// 菜园管理 — 管理员后台（更新状态、任务管理、审核）
Page({
  data: {
    loading: true,
    // 菜园状态
    gardenStatus: null,
    // 任务列表
    tasks: [],
    // 待审核记录
    pendingRecords: [],
    pendingTotal: 0,

    // ── 更新菜园状态 modal ──
    showConfigModal: false,
    configForm: { health_point: 80, current_stage: '', stage_desc: '', week_no: 1 },
    saving: false,

    // ── 发布任务 modal ──
    showTaskModal: false,
    taskForm: {
      title: '',
      icon: '',
      type: 'required',
      health_value: 15,
      points_reward: 10,
      deadline: '',
      estimated_time: '',
      max_claim: 0
    },
    publishing: false,
    deadlineDisplay: '',

    // ── 审核操作 ──
    approving: false
  },

  onLoad() {
    this.checkAdmin()
  },

  onShow() {
    if (!this.data.loading) {
      this.loadAllData()
    }
  },

  onPullDownRefresh() {
    this.loadAllData().then(() => wx.stopPullDownRefresh())
  },

  // ── 权限校验 ──
  async checkAdmin() {
    try {
      const res = await wx.cloud.callFunction({ name: 'checkAdmin' })
      if (!res.result || res.result.role !== 'admin') {
        wx.showToast({ title: '仅管理员可访问', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 1500)
        return
      }
      this.loadAllData()
    } catch (err) {
      console.error('权限检查失败:', err)
      wx.navigateBack()
    }
  },

  // ── 并行加载数据 ──
  async loadAllData() {
    this.setData({ loading: true })
    try {
      const [statusRes, tasksRes, pendingRes] = await Promise.all([
        wx.cloud.callFunction({ name: 'getStatus' }),
        wx.cloud.callFunction({ name: 'getTasks' }),
        wx.cloud.callFunction({ name: 'getPendingRecords' })
      ])

      const gardenStatus = (statusRes.result && statusRes.result.success)
        ? statusRes.result.data : null

      const taskData = (tasksRes.result && tasksRes.result.success)
        ? tasksRes.result.data : null
      const tasks = taskData ? taskData.tasks : []

      const pendingData = (pendingRes.result && pendingRes.result.success)
        ? pendingRes.result.data : null
      const pendingRecords = pendingData ? pendingData.records : []

      // 格式化待审核记录的提交时间
      pendingRecords.forEach(r => {
        if (r.submitted_at) {
          const d = new Date(r.submitted_at)
          r.submitted_at_display = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        } else {
          r.submitted_at_display = ''
        }
      })

      this.setData({
        gardenStatus,
        tasks,
        pendingRecords,
        pendingTotal: pendingData ? pendingData.total : 0,
        loading: false
      })
    } catch (err) {
      console.error('加载数据失败:', err)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // ══════════════════════════
  // ① 菜园状态 — 更新配置
  // ══════════════════════════

  openConfigModal() {
    const s = this.data.gardenStatus
    this.setData({
      showConfigModal: true,
      configForm: {
        health_point: s ? s.health_point : 80,
        current_stage: s ? s.current_stage : '',
        stage_desc: s ? s.stage_desc : '',
        week_no: s ? s.week_no : 1
      }
    })
  },

  closeConfigModal() {
    this.setData({ showConfigModal: false })
  },

  preventBubble() {},

  onConfigInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`configForm.${field}`]: e.detail.value })
  },

  onHealthSlider(e) {
    this.setData({ 'configForm.health_point': e.detail.value })
  },

  async saveConfig() {
    if (this.data.saving) return
    this.setData({ saving: true })
    try {
      const form = this.data.configForm
      const res = await wx.cloud.callFunction({
        name: 'updateConfig',
        data: {
          health_point: Number(form.health_point),
          current_stage: form.current_stage,
          stage_desc: form.stage_desc,
          week_no: Number(form.week_no)
        }
      })
      if (res.result && res.result.success) {
        wx.showToast({ title: '更新成功', icon: 'success' })
        this.closeConfigModal()
        this.loadAllData()
      } else {
        wx.showToast({ title: res.result.message || '更新失败', icon: 'none' })
      }
    } catch (err) {
      console.error('更新配置失败:', err)
      wx.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  },

  // ══════════════════════════
  // ② 任务管理
  // ══════════════════════════

  openTaskModal() {
    const s = this.data.gardenStatus
    this.setData({
      showTaskModal: true,
      taskForm: {
        title: '',
        icon: '',
        type: 'required',
        health_value: 15,
        points_reward: 10,
        deadline: '',
        estimated_time: '',
        max_claim: 0
      },
      deadlineDisplay: ''
    })
  },

  closeTaskModal() {
    this.setData({ showTaskModal: false })
  },

  onTaskInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`taskForm.${field}`]: e.detail.value })
  },

  onTypeChange(e) {
    this.setData({ 'taskForm.type': e.detail.value })
  },

  onDeadlineChange(e) {
    this.setData({
      'taskForm.deadline': e.detail.value,
      deadlineDisplay: e.detail.value
    })
  },

  async publishTask() {
    const form = this.data.taskForm
    if (!form.title.trim()) {
      wx.showToast({ title: '请填写任务名称', icon: 'none' })
      return
    }
    if (!form.icon.trim()) {
      wx.showToast({ title: '请填写图标', icon: 'none' })
      return
    }
    if (!form.deadline) {
      wx.showToast({ title: '请选择截止时间', icon: 'none' })
      return
    }

    if (this.data.publishing) return
    this.setData({ publishing: true })

    try {
      const s = this.data.gardenStatus
      const res = await wx.cloud.callFunction({
        name: 'publishTask',
        data: {
          title: form.title.trim(),
          icon: form.icon.trim(),
          type: form.type,
          health_value: Number(form.health_value),
          points_reward: Number(form.points_reward),
          week_no: s ? s.week_no : 1,
          deadline: form.deadline,
          estimated_time: form.estimated_time.trim(),
          max_claim: Number(form.max_claim)
        }
      })

      if (res.result && res.result.success) {
        wx.showToast({ title: '发布成功', icon: 'success' })
        this.closeTaskModal()
        this.loadAllData()
      } else {
        wx.showToast({ title: res.result.message || '发布失败', icon: 'none' })
      }
    } catch (err) {
      console.error('发布任务失败:', err)
      wx.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      this.setData({ publishing: false })
    }
  },

  async closeTask(e) {
    const { id, title } = e.currentTarget.dataset
    const res = await wx.showModal({
      title: '确认关闭',
      content: `关闭「${title}」后，已认领的家庭仍可提交，但不再接受新认领。`,
      confirmText: '关闭',
      confirmColor: '#E53935'
    })
    if (!res.confirm) return

    try {
      const updateRes = await wx.cloud.callFunction({
        name: 'publishTask',
        data: { task_id: id, status: 'closed' }
      })
      if (updateRes.result && updateRes.result.success) {
        wx.showToast({ title: '已关闭', icon: 'success' })
        this.loadAllData()
      } else {
        wx.showToast({ title: '操作失败', icon: 'none' })
      }
    } catch (err) {
      console.error('关闭任务失败:', err)
      wx.showToast({ title: '网络错误', icon: 'none' })
    }
  },

  // ══════════════════════════
  // ③ 审核
  // ══════════════════════════

  previewPhoto(e) {
    const { url, urls } = e.currentTarget.dataset
    wx.previewImage({ current: url, urls: urls })
  },

  async approveRecord(e) {
    const { id } = e.currentTarget.dataset
    await this.doApprove(id, 'approve')
  },

  async rejectRecord(e) {
    const { id } = e.currentTarget.dataset
    await this.doApprove(id, 'reject')
  },

  async doApprove(recordId, action) {
    if (this.data.approving) return
    this.setData({ approving: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'approveTask',
        data: { record_id: recordId, action }
      })
      if (res.result && res.result.success) {
        wx.showToast({
          title: action === 'approve' ? '已通过' : '已驳回',
          icon: 'success'
        })
        this.loadAllData()
      } else {
        wx.showToast({ title: res.result.message || '操作失败', icon: 'none' })
      }
    } catch (err) {
      console.error('审核失败:', err)
      wx.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      this.setData({ approving: false })
    }
  },

  // 格式化时间
  formatTime(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
})
