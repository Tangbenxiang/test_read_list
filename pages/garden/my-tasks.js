// pages/garden/my-tasks.js
// 我的任务 — Tab切换（待完成/待审核/已完成）+ 提交完成 + 照片上传
Page({
  data: {
    activeTab: 'claimed', // claimed / submitted / approved
    records: [],          // 所有记录
    loading: true,
    error: false,
    // Tab 数量统计
    counts: { claimed: 0, submitted: 0, approved: 0 },
    // 提交弹窗
    showSubmit: false,
    submitRecordId: '',
    submitTaskTitle: '',
    chosenPhotos: [],     // 本地临时路径
    noteInput: '',
    submitting: false
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
      const res = await wx.cloud.callFunction({ name: 'getMyTasks' })

      if (res.result && res.result.success) {
        const records = res.result.data || []
        // 按 claimed_at 倒序
        records.sort((a, b) => {
          const ta = a.claimed_at ? new Date(a.claimed_at).getTime() : 0
          const tb = b.claimed_at ? new Date(b.claimed_at).getTime() : 0
          return tb - ta
        })

        const counts = {
          claimed: records.filter(r => r.status === 'claimed').length,
          submitted: records.filter(r => r.status === 'submitted').length,
          approved: records.filter(r => r.status === 'approved' || r.status === 'rejected').length
        }

        const now = Date.now()
        records.forEach(r => {
          r.is_deadline_urgent = r.task_deadline
            ? (new Date(r.task_deadline).getTime() - now < 86400000)
            : false
        })

        this.setData({ records, counts, loading: false })
      } else {
        this.setData({ loading: false, error: true })
      }
    } catch (err) {
      console.error('加载我的任务失败:', err)
      this.setData({ loading: false, error: true })
    }
  },

  retry() {
    this.loadData()
  },

  // ── Tab 切换 ──
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
  },

  // 当前 Tab 的记录
  filteredRecords() {
    const { records, activeTab } = this.data
    if (activeTab === 'approved') {
      return records.filter(r => r.status === 'approved' || r.status === 'rejected')
    }
    return records.filter(r => r.status === activeTab)
  },

  // ── 提交完成 ──
  openSubmit(e) {
    const { recordId, taskTitle } = e.currentTarget.dataset
    this.setData({
      showSubmit: true,
      submitRecordId: recordId,
      submitTaskTitle: taskTitle,
      chosenPhotos: [],
      noteInput: ''
    })
  },

  closeSubmit() {
    this.setData({ showSubmit: false, submitting: false })
  },

  preventBubble() {},

  // 选择照片
  choosePhotos() {
    const remaining = 3 - this.data.chosenPhotos.length
    if (remaining <= 0) {
      wx.showToast({ title: '最多上传3张照片', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const newPhotos = res.tempFiles.map(f => f.tempFilePath)
        this.setData({
          chosenPhotos: [...this.data.chosenPhotos, ...newPhotos]
        })
      }
    })
  },

  // 删除已选照片
  removePhoto(e) {
    const { index } = e.currentTarget.dataset
    const photos = this.data.chosenPhotos
    photos.splice(index, 1)
    this.setData({ chosenPhotos: photos })
  },

  // 预览照片
  previewPhoto(e) {
    const { url } = e.currentTarget.dataset
    wx.previewImage({ current: url, urls: this.data.chosenPhotos })
  },

  // 备注输入
  onNoteInput(e) {
    this.setData({ noteInput: e.detail.value })
  },

  // 确认提交
  async confirmSubmit() {
    if (this.data.chosenPhotos.length === 0) {
      wx.showToast({ title: '请至少上传1张照片', icon: 'none' })
      return
    }
    if (this.data.submitting) return

    this.setData({ submitting: true })

    try {
      // 1. 逐张上传到云存储
      const fileIDs = []
      for (let i = 0; i < this.data.chosenPhotos.length; i++) {
        const filePath = this.data.chosenPhotos[i]
        const cloudPath = `garden/photos/${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}.jpg`
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath,
          filePath
        })
        fileIDs.push(uploadRes.fileID)
      }

      // 2. 调用 submitTask 云函数
      const res = await wx.cloud.callFunction({
        name: 'submitTask',
        data: {
          record_id: this.data.submitRecordId,
          photos: fileIDs,
          note: this.data.noteInput.trim()
        }
      })

      if (res.result && res.result.success) {
        wx.showToast({ title: '提交成功，等待审核 📸', icon: 'none', duration: 2000 })
        this.closeSubmit()
        this.loadData()
      } else {
        const code = res.result ? res.result.code : ''
        if (code === 'ALREADY_SUBMITTED') {
          wx.showToast({ title: '任务已提交，请等待审核', icon: 'none' })
          this.closeSubmit()
          this.loadData()
        } else {
          wx.showToast({ title: res.result.message || '提交失败', icon: 'none' })
        }
      }
    } catch (err) {
      console.error('提交失败:', err)
      wx.showToast({ title: '提交失败，请重试', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 格式化时间
  formatTime(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  },

  // 是否临近截止（24小时内）
  isNearDeadline(deadline) {
    if (!deadline) return false
    return new Date(deadline).getTime() - Date.now() < 24 * 60 * 60 * 1000
  }
})
