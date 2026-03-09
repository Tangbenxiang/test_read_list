// pages/detail/detail.js
const db = wx.cloud.database()
const app = getApp()

Page({
  data: {
    book: null,
    loading: false,
    bookId: '',
    coverStatus: '', // 封面状态：'empty', 'loading', 'loaded', 'error'
    coverRetryCount: 0, // 封面获取重试次数
    isAdmin: false, // 是否是管理员
    checkingAdmin: false, // 是否正在检查管理员权限
    planned: false // 是否在计划阅读列表中
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

      // 检查计划阅读状态
      this.checkPlannedStatus()
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

  // 检查计划阅读状态
  async checkPlannedStatus() {
    const { bookId } = this.data
    if (!bookId) return

    try {
      // 获取当前用户openid
      const openid = app.globalData.openid
      if (!openid) {
        console.log('用户未登录，无法检查计划阅读状态')
        this.setData({ planned: false })
        return
      }

      // 查询user_planned_books集合
      const res = await db.collection('user_planned_books')
        .where({
          userId: openid,
          bookId: bookId
        })
        .limit(1)
        .get()

      if (res.data && res.data.length > 0) {
        this.setData({ planned: true })
      } else {
        this.setData({ planned: false })
      }
    } catch (error) {
      console.error('检查计划阅读状态失败:', error)
      this.setData({ planned: false })
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

  // 显示权限不足提示
  showPermissionDenied() {
    wx.showToast({
      title: '只有管理员可以修改状态',
      icon: 'none',
      duration: 2000
    })
  },

  // 切换购买状态
  async togglePurchased() {
    const { isAdmin, book } = this.data
    if (!isAdmin) {
      this.showPermissionDenied()
      return
    }
    if (!book) return
    await this.updateBookStatus('purchased', !book.purchased)
  },

  // 切换阅读状态
  async toggleRead() {
    const { isAdmin, book } = this.data
    if (!isAdmin) {
      this.showPermissionDenied()
      return
    }
    if (!book) return
    await this.updateBookStatus('read', !book.read)
  },

  // 切换精读状态
  async toggleIntensive() {
    const { isAdmin, book } = this.data
    if (!isAdmin) {
      this.showPermissionDenied()
      return
    }
    if (!book) return
    await this.updateBookStatus('intensiveRead', !book.intensiveRead)
  },

  // 切换计划阅读状态
  async togglePlanned() {
    const { book, planned, bookId } = this.data
    if (!book) return

    // 检查用户是否登录
    const openid = app.globalData.openid
    if (!openid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      })
      return
    }

    wx.showLoading({
      title: '处理中...',
      mask: true
    })

    try {
      if (!planned) {
        // 添加到计划阅读列表
        const addRes = await wx.cloud.callFunction({
          name: 'addPlannedBook',
          data: {
            title: book.title,
            type: book.type,
            author: book.author,
            description: book.description || '',
            gradeLevel: book.gradeLevel,
            purchased: book.purchased || false,
            read: book.read || false,
            intensiveRead: book.intensiveRead || false,
            cover: book.cover || '',
            status: 'planned'
          }
        })

        if (addRes.result && addRes.result.success) {
          this.setData({ planned: true })
          wx.showToast({
            title: '已添加到计划阅读',
            icon: 'success',
            duration: 1500
          })
        } else {
          throw new Error(addRes.result?.message || '添加失败')
        }
      } else {
        // 从计划阅读列表删除
        // 首先需要获取计划阅读记录ID
        const queryRes = await db.collection('user_planned_books')
          .where({
            userId: openid,
            bookId: bookId
          })
          .limit(1)
          .get()

        if (queryRes.data && queryRes.data.length > 0) {
          const recordId = queryRes.data[0]._id
          const deleteRes = await wx.cloud.callFunction({
            name: 'deletePlannedBook',
            data: {
              recordId: recordId
            }
          })

          if (deleteRes.result && deleteRes.result.success) {
            this.setData({ planned: false })
            wx.showToast({
              title: '已从计划阅读移除',
              icon: 'success',
              duration: 1500
            })
          } else {
            throw new Error(deleteRes.result?.message || '删除失败')
          }
        } else {
          // 记录不存在，直接更新本地状态
          this.setData({ planned: false })
          wx.showToast({
            title: '已从计划阅读移除',
            icon: 'success',
            duration: 1500
          })
        }
      }
    } catch (error) {
      console.error('切换计划阅读状态失败:', error)
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none',
        duration: 2000
      })
    } finally {
      wx.hideLoading()
    }
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

      // 显示错误信息
      let errorMessage = '状态更新失败'
      if (error.message && error.message.includes('权限不足')) {
        errorMessage = '只有管理员可以修改书籍状态'
      } else if (error.message) {
        errorMessage = error.message
      }

      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 2000
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

  // 跳转到手动修改封面页面
  goToManualCover() {
    const { isAdmin, book, bookId } = this.data
    if (!isAdmin) {
      wx.showToast({
        title: '没有修改封面权限',
        icon: 'none',
        duration: 2000
      })
      return
    }
    if (!book) return

    // 传递书籍标题作为搜索关键词，方便在manualcover页面直接搜索
    const title = book.title.replace(/《|》/g, '') // 移除书名号
    wx.navigateTo({
      url: `/pages/manualcover/manualcover?title=${encodeURIComponent(title)}&id=${bookId}`
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