// pages/detail/detail.js
const db = wx.cloud.database()

Page({
  data: {
    book: null,
    loading: false,
    bookId: '',
    coverStatus: '', // 封面状态：'empty', 'loading', 'loaded', 'error'
    coverRetryCount: 0, // 封面获取重试次数
    isAdmin: false, // 是否是管理员
    checkingAdmin: false // 是否正在检查管理员权限
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
    this.loadBookDetail()
  },

  // 加载书籍详情
  async loadBookDetail() {
    this.setData({ loading: true })

    try {
      const res = await db.collection('books').doc(this.data.bookId).get()
      this.setData({
        book: res.data,
        loading: false
      })

      // 设置页面标题
      wx.setNavigationBarTitle({
        title: res.data.title || '书籍详情'
      })

      // 检查封面状态
      this.checkCoverStatus(res.data)

      // 检查管理员权限
      this.checkAdminPermission()
    } catch (error) {
      console.error('加载书籍详情失败:', error)
      this.setData({ loading: false })

      // 显示模拟数据（开发阶段使用）
      this.setData({
        book: this.getMockBook(),
        loading: false
      })

      wx.showToast({
        title: '使用模拟数据',
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 获取模拟书籍数据（开发阶段使用）
  getMockBook() {
    return {
      _id: this.data.bookId || '1',
      serial: 1,
      title: '《安徒生童话》',
      type: '童话',
      author: '安徒生',
      description: '包含《丑小鸭》、《卖火柴的小女孩》等经典童话故事。安徒生童话是世界儿童文学的瑰宝，以其丰富的想象、生动的描写和深刻的寓意赢得了全世界读者的喜爱。这些故事不仅适合儿童阅读，也值得成年人品味。',
      gradeLevel: '一至二年级',
      purchased: true,
      read: true,
      intensiveRead: false,
      cover: ''
    }
  },

  // 检查封面状态
  checkCoverStatus(book) {
    if (!book) return

    let coverStatus = 'loaded'
    if (!book.cover) {
      coverStatus = 'empty'
    } else if (book.cover === '') {
      coverStatus = 'empty'
    } else if (book.cover.startsWith('http')) {
      coverStatus = 'loaded'
    } else {
      coverStatus = 'error'
    }

    this.setData({ coverStatus })

    // 如果封面为空，给出提示
    if (coverStatus === 'empty') {
      console.log('书籍缺少封面，可点击"获取封面"按钮')
    }
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
          checkingAdmin: false
        })
      }
    } catch (error) {
      console.error('检查管理员权限失败:', error)
      this.setData({
        isAdmin: false,
        checkingAdmin: false
      })
    }
  },

  // 跳转到编辑页面
  editBook() {
    const { bookId, isAdmin } = this.data
    if (!isAdmin) {
      wx.showToast({
        title: '没有编辑权限',
        icon: 'none',
        duration: 2000
      })
      return
    }

    wx.navigateTo({
      url: `/pages/editbook/editbook?id=${bookId}`
    })
  },

  // 测试批量更新封面（开发调试用）
  async testBatchUpdateCovers() {
    wx.showLoading({
      title: '批量更新中...',
      mask: true
    })

    try {
      const res = await wx.cloud.callFunction({
        name: 'batchUpdateCovers',
        data: {
          limit: 5,
          skip: 0
        }
      })

      wx.hideLoading()

      if (res.result.success) {
        wx.showModal({
          title: '批量更新结果',
          content: `处理完成：成功 ${res.result.updated} 本，失败 ${res.result.failed} 本。${res.result.message}`,
          showCancel: false
        })
        console.log('批量更新结果:', res.result)
      } else {
        wx.showModal({
          title: '批量更新失败',
          content: res.result.error || '未知错误',
          showCancel: false
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('批量更新封面失败:', error)
      wx.showModal({
        title: '批量更新失败',
        content: error.message || '网络错误',
        showCancel: false
      })
    }
  },

  // 切换购买状态
  async togglePurchased() {
    await this.updateBookStatus('purchased', !this.data.book.purchased)
  },

  // 切换阅读状态
  async toggleRead() {
    await this.updateBookStatus('read', !this.data.book.read)
  },

  // 切换精读状态
  async toggleIntensive() {
    await this.updateBookStatus('intensiveRead', !this.data.book.intensiveRead)
  },

  // 获取书籍封面
  async fetchBookCover() {
    const { book } = this.data
    if (!book) return

    // 增加重试计数
    const newRetryCount = this.data.coverRetryCount + 1
    this.setData({ coverRetryCount: newRetryCount })

    wx.showLoading({
      title: '获取封面中...',
      mask: true
    })

    try {
      const res = await wx.cloud.callFunction({
        name: 'getBookCoverFromDouban',
        data: {
          bookId: book._id,
          title: book.title.replace(/《|》/g, ''), // 移除书名号
          author: book.author
        }
      })

      wx.hideLoading()

      if (res.result.success) {
        // 更新本地数据
        this.setData({
          'book.cover': res.result.coverUrl,
          coverStatus: 'loaded',
          coverRetryCount: 0 // 重置重试计数
        })

        wx.showToast({
          title: '封面获取成功',
          icon: 'success',
          duration: 2000
        })
      } else {
        this.setData({
          coverStatus: 'error'
        })
        const retryMsg = newRetryCount > 1 ? `（第${newRetryCount}次重试）` : ''
        wx.showToast({
          title: `${res.result.message || '未找到封面'}${retryMsg}`,
          icon: 'none',
          duration: 2000
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('获取封面失败:', error)
      this.setData({
        coverStatus: 'error'
      })
      const retryCount = this.data.coverRetryCount
      const retryMsg = retryCount > 1 ? `（第${retryCount}次重试）` : ''
      wx.showToast({
        title: `获取失败，请重试${retryMsg}`,
        icon: 'error',
        duration: 2000
      })
    }
  },

  // 更新书籍状态
  async updateBookStatus(field, value) {
    if (!this.data.book || !this.data.bookId) return

    // 显示加载中
    wx.showLoading({
      title: '更新中...',
      mask: true
    })

    try {
      // 使用云函数更新状态
      const res = await wx.cloud.callFunction({
        name: 'updateBookStatus',
        data: {
          bookId: this.data.bookId,
          field: field,
          value: value
        }
      })

      if (res.result && res.result.success) {
        // 更新本地数据
        const book = { ...this.data.book }
        book[field] = value

        this.setData({ book })

        wx.showToast({
          title: '状态已更新',
          icon: 'success',
          duration: 1500
        })
      } else {
        throw new Error(res.result.error || '更新失败')
      }
    } catch (error) {
      console.error('更新状态失败:', error)

      // 如果云函数调用失败，更新本地数据（开发阶段）
      const book = { ...this.data.book }
      book[field] = value

      this.setData({ book })

      wx.showToast({
        title: '本地更新成功',
        icon: 'none',
        duration: 1500
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 分享书籍
  shareBook() {
    const { book } = this.data
    if (!book) return

    wx.showActionSheet({
      itemList: ['分享给好友', '生成分享图'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.shareToFriend()
        } else if (res.tapIndex === 1) {
          this.generateShareImage()
        }
      }
    })
  },

  // 分享给好友
  shareToFriend() {
    const { book } = this.data
    wx.shareAppMessage({
      title: `推荐书籍：《${book.title}》`,
      path: `/pages/detail/detail?id=${book._id}`,
      imageUrl: book.cover || '/images/share-cover.jpg'
    })
  },

  // 生成分享图（模拟）
  generateShareImage() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
      duration: 2000
    })
  },

  // 跳转到意见建议页面
  goToFeedback() {
    wx.navigateTo({
      url: '/pages/feedback/feedback'
    })
  },

  // 跳转到新增书籍页面
  goToAddBook() {
    const { isAdmin } = this.data
    if (!isAdmin) {
      wx.showToast({
        title: '没有新增书籍权限',
        icon: 'none',
        duration: 2000
      })
      return
    }

    wx.navigateTo({
      url: '/pages/addbook/addbook'
    })
  },

  // 返回列表
  goBack() {
    wx.navigateBack()
  },

  // 页面分享
  onShareAppMessage() {
    const { book } = this.data
    if (!book) return {}

    return {
      title: `《${book.title}》 - ${book.author}`,
      path: `/pages/detail/detail?id=${book._id}`,
      imageUrl: book.cover || '/images/share-cover.jpg'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    const { book } = this.data
    if (!book) return {}

    return {
      title: `推荐阅读：《${book.title}》`,
      query: `id=${book._id}`
    }
  }
})