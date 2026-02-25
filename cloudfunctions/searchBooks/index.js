// cloudfunctions/searchBooks/index.js
const cloud = require('wx-server-sdk')

// 云函数初始化 - 使用最简单的初始化方式
// 在云函数中，可以不带参数初始化，会自动使用当前环境
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
  const db = cloud.database()
  const _ = db.command
  const { keyword, page = 0, pageSize = 20 } = event

  // 如果没有关键词，返回空结果
  if (!keyword || keyword.trim() === '') {
    return {
      success: true,
      data: [],
      total: 0
    }
  }

  try {
    // 构建模糊查询条件
    const condition = _.or([
      { title: db.RegExp({ regexp: keyword, options: 'i' }) },
      { author: db.RegExp({ regexp: keyword, options: 'i' }) },
      { type: db.RegExp({ regexp: keyword, options: 'i' }) }
    ])

    // 获取总数
    const countResult = await db.collection('books').where(condition).count()

    // 获取分页数据
    const dataResult = await db.collection('books')
      .where(condition)
      .orderBy('serial', 'asc')
      .skip(page * pageSize)
      .limit(pageSize)
      .get()

    return {
      success: true,
      data: dataResult.data,
      total: countResult.total,
      page: page,
      pageSize: pageSize,
      hasMore: (page + 1) * pageSize < countResult.total
    }
  } catch (error) {
    console.error('搜索书籍失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}