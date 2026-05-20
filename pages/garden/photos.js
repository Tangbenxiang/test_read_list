// pages/garden/photos.js
// 成长相册 — 按周分组展示 + 全屏预览 + 管理员上传
Page({
  data: {
    loading: true,
    error: false,
    isAdmin: false,
    totalPhotos: 0,
    totalWeeks: 0,
    weekList: [],
    photosByWeek: {},
    weekUrls: {},
    // 全屏预览
    showPreview: false,
    previewUrl: '',
    previewName: '',
    previewCaption: '',
    previewAllUrls: [],
    // 上传
    uploading: false
  },

  onLoad() {
    this.checkAdmin()
  },

  onShow() {
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh())
  },

  async checkAdmin() {
    try {
      const app = getApp()
      const role = app.globalData.userInfo && app.globalData.userInfo.role
      this.setData({ isAdmin: role === 'admin' || role === 'teacher' })
    } catch (err) {
      // 忽略
    }
  },

  async loadData() {
    this.setData({ loading: true, error: false })
    try {
      const res = await wx.cloud.callFunction({ name: 'getPhotos' })
      if (res.result && res.result.success) {
        const { photos_by_week, week_list, total } = res.result.data
        const byWeek = photos_by_week || {}

        // 为每周的照片列表预计算 URL 数组，避免 WXML 中使用 .map()
        const weekUrls = {}
        for (const week of Object.keys(byWeek)) {
          weekUrls[week] = byWeek[week].map(p => p.image_url)
        }

        this.setData({
          photosByWeek: byWeek,
          weekUrls,
          weekList: week_list || [],
          totalPhotos: total || 0,
          totalWeeks: (week_list || []).length,
          loading: false
        })
      } else {
        this.setData({ loading: false, error: true })
      }
    } catch (err) {
      console.error('加载相册失败:', err)
      this.setData({ loading: false, error: true })
    }
  },

  retry() {
    this.loadData()
  },

  // 全屏预览
  openPreview(e) {
    const { url, name, caption, urls } = e.currentTarget.dataset
    this.setData({
      showPreview: true,
      previewUrl: url,
      previewName: name || '',
      previewCaption: caption || '',
      previewAllUrls: urls || [url]
    })
  },

  closePreview() {
    this.setData({ showPreview: false })
  },

  // 管理员上传照片
  async chooseAndUpload() {
    if (this.data.uploading) return
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: async (res) => {
        const tempPath = res.tempFiles[0].tempFilePath
        this.setData({ uploading: true })

        try {
          // 1. 上传到云存储
          const cloudPath = `garden/photos/manual_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.jpg`
          const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: tempPath })

          // 2. 调用 addPhoto 云函数
          const addRes = await wx.cloud.callFunction({
            name: 'addPhoto',
            data: { image_url: uploadRes.fileID }
          })

          if (addRes.result && addRes.result.success) {
            wx.showToast({ title: '上传成功', icon: 'success' })
            this.loadData()
          } else {
            wx.showToast({ title: '上传失败', icon: 'none' })
          }
        } catch (err) {
          console.error('上传照片失败:', err)
          wx.showToast({ title: '上传失败', icon: 'none' })
        } finally {
          this.setData({ uploading: false })
        }
      }
    })
  },

  onShareAppMessage() {
    return {
      title: '菜园成长相册',
      path: '/pages/garden/photos'
    }
  }
})