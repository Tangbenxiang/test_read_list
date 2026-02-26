const db = wx.cloud.database()

Page({
  data: {
    books: [],
    loading: false
  },

  onLoad() {
    this.loadBooks()
  },

  // 加载书籍列表
  async loadBooks() {
    this.setData({ loading: true })

    try {
      // 查询前5本书
      const res = await db.collection('books')
        .orderBy('serial', 'asc')
        .limit(5)
        .get()

      // 添加newCoverUrl字段用于输入
      const books = res.data.map(book => ({
        ...book,
        newCoverUrl: ''
      }))

      this.setData({
        books,
        loading: false
      })
    } catch (error) {
      console.error('加载书籍失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
      this.setData({ loading: false })

      // 如果数据库查询失败，使用测试数据
      this.useTestData()
    }
  },

  // 使用测试数据（备用）
  useTestData() {
    const testBooks = [
      {
        serial: 1,
        title: "窗边的小豆豆",
        author: "黑柳彻子",
        cover: ""
      },
      {
        serial: 2,
        title: "一年级的小蜜瓜",
        author: "商晓娜",
        cover: ""
      },
      {
        serial: 3,
        title: "月光下的肚肚狼",
        author: "冰波",
        cover: ""
      },
      {
        serial: 4,
        title: "上学是一场最大的冒险",
        author: "（德）奥利弗·舍茨",
        cover: ""
      },
      {
        serial: 5,
        title: "没头脑和不高兴",
        author: "任溶溶",
        cover: ""
      }
    ].map(book => ({
      ...book,
      newCoverUrl: ''
    }))

    this.setData({ books: testBooks })
  },

  // 输入框变化
  onInputChange(e) {
    const { index } = e.currentTarget.dataset
    const value = e.detail.value

    const books = [...this.data.books]
    books[index].newCoverUrl = value

    this.setData({ books })
  },

  // 更新封面
  async updateCover(e) {
    const { index } = e.currentTarget.dataset
    const book = this.data.books[index]
    const newCoverUrl = book.newCoverUrl.trim()

    if (!newCoverUrl) {
      wx.showToast({
        title: '请输入URL',
        icon: 'none'
      })
      return
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
      const books = [...this.data.books]
      books[index].cover = newCoverUrl
      books[index].newCoverUrl = ''

      this.setData({ books })

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

  // 豆瓣搜索
  searchDouban(e) {
    const { title, author } = e.currentTarget.dataset
    const searchText = encodeURIComponent(`${title} ${author}`)
    const url = `https://www.douban.com/search?q=${searchText}&cat=1001`

    this.copySearchText(title, author, '豆瓣')

    // 提示用户手动打开浏览器
    wx.showModal({
      title: '豆瓣搜索',
      content: `搜索词已复制到剪贴板：${title} ${author}\n请打开浏览器访问豆瓣搜索`,
      showCancel: false
    })
  },

  // 京东搜索
  searchJD(e) {
    const { title } = e.currentTarget.dataset
    const searchText = encodeURIComponent(title)
    const url = `https://search.jd.com/Search?keyword=${searchText}&enc=utf-8&wq=${searchText}&pvid=xxx`

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

  // 返回
  goBack() {
    wx.navigateBack()
  }
})