// cloudfunctions/deletePlannedBook/index.js
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

  const { recordId } = event // 计划阅读记录ID

  try {
    // 1. 验证用户是否登录
    if (!OPENID) {
      return {
        success: false,
        error: '未登录',
        message: '请先登录'
      }
    }

    // 2. 验证必要参数
    if (!recordId) {
      return {
        success: false,
        error: '参数不完整',
        message: '记录ID为必填项'
      }
    }

    console.log('deletePlannedBook调用，参数:', { recordId, OPENID: OPENID ? `${OPENID.substring(0, 8)}...` : 'null' })

    // 3. 验证记录是否存在且属于当前用户
    const record = await db.collection('user_planned_books')
      .doc(recordId)
      .get()

    if (!record.data) {
      return {
        success: false,
        error: '记录不存在',
        message: '未找到该计划阅读记录'
      }
    }

    // 4. 验证记录是否属于当前用户
    if (record.data.userId !== OPENID) {
      return {
        success: false,
        error: '权限不足',
        message: '只能删除自己的计划阅读记录'
      }
    }

    // 5. 删除记录
    const deleteResult = await db.collection('user_planned_books')
      .doc(recordId)
      .remove()

    if (deleteResult.stats.removed > 0) {
      console.log('删除成功，记录ID:', recordId, '书籍ID:', record.data.bookId)
      return {
        success: true,
        message: '已从计划阅读列表删除',
        bookId: record.data.bookId
      }
    } else {
      console.error('删除失败，记录ID:', recordId)
      return {
        success: false,
        error: '删除失败',
        message: '删除失败，请重试'
      }
    }
  } catch (error) {
    console.error('删除计划阅读记录失败:', error)
    return {
      success: false,
      error: error.message,
      message: '删除失败，请稍后重试'
    }
  }
}