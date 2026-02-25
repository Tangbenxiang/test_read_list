// pages/editbook/editbook.js
const db = wx.cloud.database()

Page({
  data: {
    // 书籍数据
    bookId: '',
    originalBook: null,
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
    loading: true,
    isAdmin: false,
    checkingAdmin: true,
    submitting: false,
    errorMessage: '',
    hasChanges: false
  },

  onLoad(options) {
    const { id } = options
    if (!id) {
      wx.showToast({
        title: '书籍ID不能为空',
        icon: 'error'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }

    this.setData({ bookId: id })
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
        this.loadBookDetail()
      } else {
        this.setData({
          isAdmin: false,
          checkingAdmin: false,
          loading: false,
          errorMessage: '您没有权限编辑书籍'
        })
      }
    } catch (error) {
      console.error('检查管理员权限失败:', error)
      this.setData({
        isAdmin: false,
        checkingAdmin: false,
        loading: false,
        errorMessage: '权限检查失败，请稍后重试'
      })
    }
  },

  // 加载书籍详情
  async loadBookDetail() {
    this.setData({ loading: true })

    try {
      const res = await db.collection('books').doc(this.data.bookId).get()

      if (res.data) {
        const book = res.data
        this.setData({
          originalBook: book,
          formData: {
            title: book.title || '',
            type: book.type || '',
            author: book.author || '',
            description: book.description || '',
            gradeLevel: book.gradeLevel || '一至二年级',
            purchased: book.purchased || false,
            read: book.read || false,
            intensiveRead: book.intensiveRead || false,
            cover: book.cover || ''
          },
          loading: false
        })

        // 设置页面标题
        wx.setNavigationBarTitle({
          title: `编辑：${book.title || '书籍'}`
        })
      } else {
        throw new Error('书籍不存在')
      }
    } catch (error) {
      console.error('加载书籍详情失败:', error)
      this.setData({
        loading: false,
        errorMessage: '加载书籍信息失败'
      })
      wx.showToast({
        title: '加载失败',
        icon: 'error',
        duration: 2000
      })
    }
  },

  // 表单输入处理
  onInputChange(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value

    this.setData({
      [`formData.${field}`]: value
    }, () => {
      this.checkForChanges()
    })
  },

  // 选择器变化处理
  onPickerChange(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value

    let selectedValue
    if (field === 'type') {
      selectedValue = this.data.typeOptions[value]
    } else if (field === 'gradeLevel') {
      selectedValue = this.data.gradeOptions[value]
    }

    this.setData({
      [`formData.${field}`]: selectedValue
    }, () => {
      this.checkForChanges()
    })
  },

  // 开关切换处理
  onSwitchChange(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value

    this.setData({
      [`formData.${field}`]: value
    }, () => {
      this.checkForChanges()
    })
  },

  // 检查是否有更改
  checkForChanges() {
    const { originalBook, formData } = this.data
    if (!originalBook) return

    let hasChanges = false
    const fields = ['title', 'type', 'author', 'description', 'gradeLevel', 'purchased', 'read', 'intensiveRead', 'cover']

    for (const field of fields) {
      if (field === 'purchased' || field === 'read' || field === 'intensiveRead') {
        if (formData[field] !== originalBook[field]) {
          hasChanges = true
          break
        }
      } else {
        if (formData[field] !== (originalBook[field] || '')) {
          hasChanges = true
          break
        }
      }
    }

    this.setData({ hasChanges })
  },

  // 提交更新
  async submitUpdate() {
    const { bookId, formData, originalBook, submitting, isAdmin, hasChanges } = this.data

    // 验证权限
    if (!isAdmin) {
      wx.showToast({
        title: '没有操作权限',
        icon: 'error',
        duration: 2000
      })
      return
    }

    if (!hasChanges) {
      wx.showToast({
        title: '没有修改内容',
        icon: 'none',
        duration: 2000
      })
      return
    }

    if (submitting) return

    // 验证必要字段
    if (!formData.title.trim()) {
      wx.showToast({
        title: '书名不能为空',
        icon: 'none',
        duration: 2000
      })
      return
    }

    if (!formData.type.trim()) {
      wx.showToast({
        title: '书籍类型不能为空',
        icon: 'none',
        duration: 2000
      })
      return
    }

    if (!formData.author.trim()) {
      wx.showToast({
        title: '作者不能为空',
        icon: 'none',
        duration: 2000
      })
      return
    }

    this.setData({ submitting: true })

    wx.showLoading({
      title: '更新中...',
      mask: true
    })

    try {
      const res = await wx.cloud.callFunction({
        name: 'updateBookInfo',
        data: {
          bookId,
          ...formData
        }
      })

      wx.hideLoading()

      if (res.result.success) {
        wx.showToast({
          title: '更新成功',
          icon: 'success',
          duration: 2000
        })

        // 更新原始数据
        this.setData({
          originalBook: { ...originalBook, ...formData },
          hasChanges: false
        })

        // 延迟返回
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: res.result.message || '更新失败',
          icon: 'none',
          duration: 2000
        })
      }
    } catch (error) {
      console.error('更新书籍失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '更新失败，请重试',
        icon: 'error',
        duration: 2000
      })
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 重置表单
  resetForm() {
    const { originalBook } = this.data
    if (!originalBook) return

    this.setData({
      formData: {
        title: originalBook.title || '',
        type: originalBook.type || '',
        author: originalBook.author || '',
        description: originalBook.description || '',
        gradeLevel: originalBook.gradeLevel || '一至二年级',
        purchased: originalBook.purchased || false,
        read: originalBook.read || false,
        intensiveRead: originalBook.intensiveRead || false,
        cover: originalBook.cover || ''
      },
      hasChanges: false
    })
  },

  // 返回上一页
  goBack() {
    if (this.data.hasChanges) {
      wx.showModal({
        title: '提示',
        content: '您有未保存的修改，确定要离开吗？',
        success: (res) => {
          if (res.confirm) {
            wx.navigateBack()
          }
        }
      })
    } else {
      wx.navigateBack()
    }
  },

  // 页面分享
  onShareAppMessage() {
    return {
      title: '编辑书籍 - 儿童阅读记录',
      path: `/pages/editbook/editbook?id=${this.data.bookId}`
    }
  }
})