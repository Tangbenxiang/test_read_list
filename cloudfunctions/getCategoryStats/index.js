// cloudfunctions/getCategoryStats/index.js
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

  try {
    // 并行查询各分类数量
    const [grade1, grade2, grade3, unread, purchased, intensive] = await Promise.all([
      db.collection('books').where({ gradeLevel: '一至二年级' }).count(),
      db.collection('books').where({ gradeLevel: '三至四年级' }).count(),
      db.collection('books').where({ gradeLevel: '五至六年级' }).count(),
      db.collection('books').where({ read: false }).count(),
      db.collection('books').where({ purchased: true }).count(),
      db.collection('books').where({ intensiveRead: true }).count()
    ])

    return {
      success: true,
      data: {
        grade1: grade1.total,
        grade2: grade2.total,
        grade3: grade3.total,
        unread: unread.total,
        purchased: purchased.total,
        intensive: intensive.total
      }
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}