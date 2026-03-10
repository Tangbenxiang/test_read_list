// cloudfunctions/getPlannedBooks/index.js
const cloud = require('wx-server-sdk')

// 云函数初始化
try {
  cloud.init({})
} catch (error) {
  console.error('云函数初始化失败:', error)
  // 如果简单初始化失败，尝试使用固定环境
  try {
    cloud.init({
      env: 'cloudbase-4gnknimqbe0440c9'
    })
  } catch (fixedError) {
    console.error('固定环境初始化也失败:', fixedError)
  }
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()
  const _ = db.command

  const { status } = event // 可选：按状态筛选

  try {
    // 1. 验证用户是否登录
    if (!OPENID) {
      return {
        success: false,
        error: '未登录',
        message: '请先登录'
      }
    }

    // 2. 构建查询条件
    let query = { userId: OPENID }
    if (status && ['planned', 'reading', 'completed'].includes(status)) {
      query.status = status
    }

    // 3. 获取用户的计划阅读列表
    const plannedBooksResult = await db.collection('user_planned_books')
      .where(query)
      .orderBy('addedTime', 'desc')
      .get()

    if (plannedBooksResult.data.length === 0) {
      return {
        success: true,
        data: [],
        message: '暂无计划阅读书籍'
      }
    }

    // 4. 提取书籍ID列表
    const bookIds = plannedBooksResult.data.map(item => item.bookId)

    // 5. 批量获取书籍详细信息
    const booksResult = await db.collection('books')
      .where({
        _id: _.in(bookIds)
      })
      .get()

    // 6. 创建书籍ID到详细信息的映射
    const booksMap = {}
    booksResult.data.forEach(book => {
      booksMap[book._id] = book
    })

    // 7. 合并计划阅读数据和书籍数据
    const plannedBooksWithDetails = plannedBooksResult.data.map(planned => {
      const bookInfo = booksMap[planned.bookId] || {
        title: '未知书籍',
        author: '未知作者',
        type: '未知类型',
        gradeLevel: '未知年级',
        cover: ''
      }

      return {
        ...planned,
        bookInfo: {
          ...bookInfo,
          // 避免返回 _openid 等敏感字段
          _openid: undefined
        }
      }
    })

    // 8. 按状态统计
    const stats = {
      planned: 0,
      reading: 0,
      completed: 0,
      total: plannedBooksResult.data.length
    }

    plannedBooksResult.data.forEach(item => {
      if (stats[item.status] !== undefined) {
        stats[item.status]++
      }
    })

    return {
      success: true,
      data: plannedBooksWithDetails,
      stats: stats,
      message: '获取成功'
    }
  } catch (error) {
    console.error('获取计划阅读书籍失败:', error)

    // 处理集合不存在的情况
    if (error.message.includes('DATABASE_COLLECTION_NOT_EXIST') ||
        error.message.includes('collection.get:fail')) {
      console.log('user_planned_books集合不存在，返回空数据')
      return {
        success: true,
        data: [],
        stats: {
          planned: 0,
          reading: 0,
          completed: 0,
          total: 0
        },
        message: '暂无计划阅读书籍'
      }
    }

    return {
      success: false,
      error: error.message,
      message: '获取失败，请稍后重试'
    }
  }
}