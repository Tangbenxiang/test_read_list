const db = wx.cloud.database()

Page({
  data: {
    // 权限相关
    isAdmin: false,
    checkingAdmin: true,
    errorMessage: '',

    // 书籍信息
    book: null,
    bookId: '',
    coverUrl: '',

    // 图片上传相关
    uploading: false,
    uploadProgress: 0,
    tempImagePath: '',

    // 状态
    loading: false
  },

  onLoad(options) {
    // 从详情页获取书籍ID
    if (options && options.id) {
      const bookId = options.id
      this.setData({ bookId })
    }

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
        // 权限检查成功后加载书籍信息
        this.loadBookInfo()
      } else {
        this.setData({
          isAdmin: false,
          checkingAdmin: false,
          errorMessage: '您没有权限修改封面'
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

  // 加载书籍信息
  async loadBookInfo() {
    const { bookId } = this.data
    if (!bookId) {
      wx.showToast({
        title: '书籍ID缺失',
        icon: 'error'
      })
      return
    }

    this.setData({ loading: true })

    try {
      const db = wx.cloud.database()
      const res = await db.collection('books').doc(bookId).get()
      this.setData({
        book: res.data,
        loading: false
      })
    } catch (error) {
      console.error('加载书籍信息失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
      this.setData({ loading: false })
    }
  },

  // URL输入处理
  onUrlInput(e) {
    this.setData({
      coverUrl: e.detail.value
    })
  },

  // 使用输入的URL更新封面
  async updateWithUrl() {
    const { coverUrl, bookId, isAdmin } = this.data
    if (!isAdmin) {
      wx.showToast({
        title: '没有操作权限',
        icon: 'error',
        duration: 2000
      })
      return
    }

    if (!coverUrl.trim()) {
      wx.showToast({
        title: '请输入封面URL',
        icon: 'none'
      })
      return
    }

    // 验证URL格式
    if (!coverUrl.startsWith('http')) {
      wx.showToast({
        title: 'URL格式错误，请以http或https开头',
        icon: 'none'
      })
      return
    }

    await this.updateCover(coverUrl)
  },

  // 更新封面到数据库
  async updateCover(coverUrl) {
    const { bookId, isAdmin } = this.data
    if (!isAdmin || !bookId) return

    wx.showLoading({ title: '更新中...' })

    try {
      const db = wx.cloud.database()
      await db.collection('books').doc(bookId).update({
        data: {
          cover: coverUrl,
          updateTime: db.serverDate()
        }
      })

      // 更新本地数据
      this.setData({
        'book.cover': coverUrl,
        coverUrl: '' // 清空输入框
      })

      wx.hideLoading()
      wx.showToast({
        title: '封面更新成功',
        icon: 'success',
        duration: 2000
      })
    } catch (error) {
      console.error('更新封面失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '更新失败',
        icon: 'error',
        duration: 2000
      })
    }
  },


  // 批量URL输入处理
  onBatchUrlInput(e) {
    this.setData({
      batchCoverUrl: e.detail.value
    })
  },

  // 搜索结果输入处理
  onResultInput(e) {
    const { index } = e.currentTarget.dataset
    const value = e.detail.value

    const searchResults = [...this.data.searchResults]
    searchResults[index].newCoverUrl = value

    this.setData({ searchResults })
  },

  // 输入框获得焦点时设置当前编辑索引
  onResultFocus(e) {
    const { index } = e.currentTarget.dataset
    this.setData({ currentEditIndex: index })
  },

  // 批量URL输入框获得焦点时清除当前编辑索引
  onBatchUrlFocus(e) {
    this.setData({ currentEditIndex: undefined })
  },

  // 空函数，用于阻止事件冒泡
  doNothing() {
    // 空函数，仅用于阻止事件冒泡
  },

  // 搜索书籍
  async searchBooks() {
    const { searchKeyword, isAdmin } = this.data
    console.log('开始搜索，关键词:', searchKeyword, 'isAdmin:', isAdmin)

    if (!isAdmin) {
      wx.showToast({
        title: '没有操作权限',
        icon: 'error',
        duration: 2000
      })
      return
    }

    if (!searchKeyword.trim()) {
      wx.showToast({
        title: '请输入搜索关键词',
        icon: 'none'
      })
      return
    }

    this.setData({ searching: true })
    wx.showLoading({ title: '搜索中...' })

    try {
      // 使用云函数搜索书籍
      console.log('调用云函数 searchBooks，参数:', { keyword: searchKeyword, pageSize: 50 })
      const res = await wx.cloud.callFunction({
        name: 'searchBooks',
        data: {
          keyword: searchKeyword,
          pageSize: 50 // 使用pageSize参数
        }
      })

      console.log('云函数返回结果:', res)

      if (res.result && res.result.success) {
        console.log('搜索成功，返回数据:', res.result.data)
        // 添加newCoverUrl字段用于输入
        const searchResults = (res.result.data || []).map(book => ({
          ...book,
          newCoverUrl: ''
        }))

        this.setData({
          searchResults,
          hasSearched: true,
          searching: false
        })

        wx.hideLoading()

        if (searchResults.length === 0) {
          wx.showToast({
            title: '未找到相关书籍',
            icon: 'none'
          })
        } else {
          wx.showToast({
            title: `找到 ${searchResults.length} 本书`,
            icon: 'success'
          })
        }
      } else {
        console.error('云函数返回失败:', res.result)
        const errorMsg = res.result ? res.result.error || res.result.message : '搜索失败'
        throw new Error(errorMsg)
      }
    } catch (error) {
      console.error('搜索书籍失败:', error)
      wx.hideLoading()
      this.setData({ searching: false })

      wx.showToast({
        title: '云函数搜索失败，尝试备用搜索',
        icon: 'none',
        duration: 2000
      })

      // 如果云函数失败，尝试直接数据库查询
      this.fallbackSearch(searchKeyword)
    }
  },

  // 备用搜索方法（直接数据库查询）
  async fallbackSearch(keyword) {
    try {
      const res = await db.collection('books')
        .where({
          title: db.RegExp({
            regexp: keyword,
            options: 'i' // 不区分大小写
          })
        })
        .limit(50)
        .get()

      const searchResults = res.data.map(book => ({
        ...book,
        newCoverUrl: ''
      }))

      this.setData({
        searchResults,
        hasSearched: true,
        searching: false
      })

      if (searchResults.length === 0) {
        wx.showToast({
          title: '未找到相关书籍',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('备用搜索失败:', error)
      wx.showToast({
        title: '搜索失败，请重试',
        icon: 'error'
      })
      this.setData({ searching: false })
    }
  },

  // 更新单本书籍封面
  async updateSingleCover(e) {
    const { index } = e.currentTarget.dataset
    await this.updateCoverAtIndex(index, false)
  },

  // 使用批量URL更新
  async updateWithBatchUrl(e) {
    const { index } = e.currentTarget.dataset
    await this.updateCoverAtIndex(index, true)
  },

  // 更新封面核心函数
  async updateCoverAtIndex(index, useBatchUrl = false) {
    const { searchResults, isAdmin, batchCoverUrl } = this.data

    if (!isAdmin) {
      wx.showToast({
        title: '没有操作权限',
        icon: 'error',
        duration: 2000
      })
      return
    }

    const book = searchResults[index]
    let newCoverUrl = ''

    if (useBatchUrl) {
      newCoverUrl = batchCoverUrl.trim()
      if (!newCoverUrl) {
        wx.showToast({
          title: '请先输入批量URL',
          icon: 'none'
        })
        return
      }
    } else {
      newCoverUrl = book.newCoverUrl.trim()
      if (!newCoverUrl) {
        wx.showToast({
          title: '请输入封面URL',
          icon: 'none'
        })
        return
      }
    }

    // 验证URL格式
    if (!newCoverUrl.startsWith('http')) {
      wx.showToast({
        title: 'URL格式错误',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '更新中...' })

    try {
      // 更新数据库
      await db.collection('books').doc(book._id).update({
        data: {
          cover: newCoverUrl,
          updateTime: db.serverDate()
        }
      })

      // 更新本地数据
      const updatedResults = [...searchResults]
      updatedResults[index].cover = newCoverUrl
      if (!useBatchUrl) {
        updatedResults[index].newCoverUrl = ''
      }

      this.setData({ searchResults: updatedResults })

      wx.showToast({
        title: '更新成功',
        icon: 'success'
      })

      // 预览封面
      setTimeout(() => {
        wx.previewImage({
          urls: [newCoverUrl],
          current: newCoverUrl
        })
      }, 500)

    } catch (error) {
      console.error('更新封面失败:', error)
      wx.showToast({
        title: '更新失败',
        icon: 'error'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 预览封面
  previewCover(e) {
    const { url } = e.currentTarget.dataset
    if (url) {
      wx.previewImage({
        urls: [url],
        current: url
      })
    }
  },

  // 豆瓣搜索（保留原有功能）
  searchDouban(e) {
    const { title, author } = e.currentTarget.dataset
    const searchText = encodeURIComponent(`${title} ${author}`)

    this.copySearchText(title, author, '豆瓣')

    wx.showModal({
      title: '豆瓣搜索',
      content: `搜索词已复制到剪贴板：${title} ${author}\n请打开浏览器访问豆瓣搜索`,
      showCancel: false
    })
  },

  // 京东搜索（保留原有功能）
  searchJD(e) {
    const { title } = e.currentTarget.dataset
    const searchText = encodeURIComponent(title)

    this.copySearchText(title, '', '京东')

    wx.showModal({
      title: '京东搜索',
      content: `搜索词已复制到剪贴板：${title}\n请打开浏览器访问京东搜索`,
      showCancel: false
    })
  },

  // 复制搜索文本
  copySearchText(title, author, source) {
    const searchText = author ? `${title} ${author}` : title

    wx.setClipboardData({
      data: searchText,
      success: () => {
        console.log('搜索词已复制:', searchText)
      }
    })
  },

  // 清除搜索
  clearSearch() {
    this.setData({
      searchKeyword: '',
      batchCoverUrl: '',
      searchResults: [],
      hasSearched: false
    })
  },

  // 选择图片
  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        const tempImagePath = res.tempFilePaths[0]
        this.setData({ tempImagePath })
        this.uploadImage(tempImagePath)
      },
      fail: (err) => {
        console.error('选择图片失败:', err)
        wx.showToast({
          title: '选择图片失败',
          icon: 'error'
        })
      }
    })
  },

  // 拍照
  takePhoto() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera'],
      success: (res) => {
        const tempImagePath = res.tempFilePaths[0]
        this.setData({ tempImagePath })
        this.uploadImage(tempImagePath)
      },
      fail: (err) => {
        console.error('拍照失败:', err)
        wx.showToast({
          title: '拍照失败',
          icon: 'error'
        })
      }
    })
  },

  // 上传图片到云存储
  async uploadImage(filePath) {
    if (!filePath) return

    this.setData({
      uploading: true,
      uploadProgress: 0
    })

    try {
      // 生成唯一文件名
      const timestamp = new Date().getTime()
      const randomStr = Math.random().toString(36).substr(2, 8)
      const cloudPath = `book-covers/${timestamp}_${randomStr}.jpg`

      // 上传文件
      const uploadTask = wx.cloud.uploadFile({
        cloudPath,
        filePath,
        success: (res) => {
          // 获取文件ID
          const fileID = res.fileID

          // 获取临时URL（有效期2小时）
          wx.cloud.getTempFileURL({
            fileList: [fileID],
            success: (urlRes) => {
              const fileURL = urlRes.fileList[0].tempFileURL

              // 自动填充到当前编辑的输入框
              this.fillCoverUrl(fileURL)

              this.setData({
                uploading: false,
                uploadProgress: 100,
                tempImagePath: ''
              })

              wx.showToast({
                title: '上传成功',
                icon: 'success'
              })
            },
            fail: (urlErr) => {
              console.error('获取文件URL失败:', urlErr)
              wx.showToast({
                title: '获取URL失败',
                icon: 'error'
              })
              this.setData({ uploading: false })
            }
          })
        },
        fail: (err) => {
          console.error('上传失败:', err)
          wx.showToast({
            title: '上传失败',
            icon: 'error'
          })
          this.setData({ uploading: false })
        }
      })

      // 监听上传进度
      uploadTask.onProgressUpdate((res) => {
        this.setData({ uploadProgress: res.progress })
      })
    } catch (error) {
      console.error('上传异常:', error)
      wx.showToast({
        title: '上传异常',
        icon: 'error'
      })
      this.setData({ uploading: false })
    }
  },

  // 填充封面URL到输入框
  fillCoverUrl(url) {
    // 上传成功后直接更新封面
    this.updateCover(url)
  },

  // 返回
  goBack() {
    wx.navigateBack()
  }
})