// pages/addbook/addbook.js
Page({
  data: {
    // 表单数据
    formData: {
      title: '',
      type: '',
      author: '',
      description: '',
      gradeLevel: '一至二年级',
      purchased: false,
      read: false,
      intensiveRead: false,
      cover: ''
    },
    // 书籍类型选项
    typeOptions: [
      '童话', '科普', '古典文学', '儿童文学小说', '校园生活', '绘本',
      '奇幻童话/敦煌文化启蒙', '侦探小说（青少版）', '奇幻小说',
      '儿童散文/成长观察', '儿童文学', '其他'
    ],
    // 年级选项
    gradeOptions: ['一至二年级', '三至四年级', '五至六年级'],
    // 状态
    submitting: false,
    isAdmin: false,
    checkingAdmin: true,
    errorMessage: ''
  },

  onLoad() {
    this.checkAdminPermission()
  },

  // 检查管理员权限
  async checkAdminPermission() {
    this.setData({ checkingAdmin: true })

    try {
      const res = await wx.cloud.callFunction({
        name: 'checkAdmin'
      })

      if (res.result.success && res.result.isAdmin) {
        this.setData({
          isAdmin: true,
          checkingAdmin: false
        })
      } else {
        this.setData({
          isAdmin: false,
          checkingAdmin: false,
          errorMessage: '您没有权限添加书籍'
        })
      }
    } catch (error) {
      console.error('检查管理员权限失败:', error)
      this.setData({
        isAdmin: false,
        checkingAdmin: false,
        errorMessage: '权限检查失败，请稍后重试'
      })
    }
  },

  // 表单输入处理
  onInputChange(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value

    this.setData({
      [`formData.${field}`]: value
    })
  },

  // 选择器变化处理
  onPickerChange(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value

    if (field === 'type') {
      this.setData({
        [`formData.${field}`]: this.data.typeOptions[value]
      })
    } else if (field === 'gradeLevel') {
      this.setData({
        [`formData.${field}`]: this.data.gradeOptions[value]
      })
    }
  },

  // 开关切换处理
  onSwitchChange(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value

    this.setData({
      [`formData.${field}`]: value
    })
  },

  // 提交表单
  async submitForm() {
    const { formData, submitting, isAdmin } = this.data

    // 验证权限
    if (!isAdmin) {
      wx.showToast({
        title: '没有操作权限',
        icon: 'error',
        duration: 2000
      })
      return
    }

    if (submitting) return

    // 验证必要字段
    if (!formData.title.trim()) {
      wx.showToast({
        title: '请输入书名',
        icon: 'none',
        duration: 2000
      })
      return
    }

    if (!formData.type.trim()) {
      wx.showToast({
        title: '请选择书籍类型',
        icon: 'none',
        duration: 2000
      })
      return
    }

    if (!formData.author.trim()) {
      wx.showToast({
        title: '请输入作者',
        icon: 'none',
        duration: 2000
      })
      return
    }

    this.setData({ submitting: true })

    wx.showLoading({
      title: '添加中...',
      mask: true
    })

    try {
      const res = await wx.cloud.callFunction({
        name: 'addBook',
        data: formData
      })

      wx.hideLoading()

      if (res.result.success) {
        wx.showToast({
          title: '添加成功',
          icon: 'success',
          duration: 2000
        })

        // 清空表单
        this.setData({
          formData: {
            title: '',
            type: '',
            author: '',
            description: '',
            gradeLevel: '一至二年级',
            purchased: false,
            read: false,
            intensiveRead: false,
            cover: ''
          }
        })

        // 延迟返回
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: res.result.message || '添加失败',
          icon: 'none',
          duration: 2000
        })
      }
    } catch (error) {
      console.error('添加书籍失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '添加失败，请重试',
        icon: 'error',
        duration: 2000
      })
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 页面分享
  onShareAppMessage() {
    return {
      title: '添加新书籍 - 儿童阅读记录',
      path: '/pages/addbook/addbook'
    }
  }
})