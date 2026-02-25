// cloudfunctions/updateBookInfo/index.js
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

  const {
    bookId,
    title,
    type,
    author,
    description,
    gradeLevel,
    purchased,
    read,
    intensiveRead,
    cover
  } = event

  try {
    // 1. 检查管理员权限
    const adminCheck = await db.collection('admins')
      .where({
        openid: OPENID,
        role: 'admin'
      })
      .get()

    if (adminCheck.data.length === 0) {
      return {
        success: false,
        error: '权限不足',
        message: '只有管理员可以修改书籍信息'
      }
    }

    // 2. 验证必要参数
    if (!bookId) {
      return {
        success: false,
        error: '参数错误',
        message: '书籍ID不能为空'
      }
    }

    // 3. 构建更新数据
    const updateData = {}

    // 只更新提供的字段
    if (title !== undefined) updateData.title = title
    if (type !== undefined) updateData.type = type
    if (author !== undefined) updateData.author = author
    if (description !== undefined) updateData.description = description
    if (gradeLevel !== undefined) {
      // 验证年级字段格式
      const validGradeLevels = ['一至二年级', '三至四年级', '五至六年级']
      if (!validGradeLevels.includes(gradeLevel)) {
        return {
          success: false,
          error: '参数错误',
          message: '年级必须为：一至二年级、三至四年级、五至六年级'
        }
      }
      updateData.gradeLevel = gradeLevel
    }
    if (purchased !== undefined) updateData.purchased = purchased
    if (read !== undefined) updateData.read = read
    if (intensiveRead !== undefined) updateData.intensiveRead = intensiveRead
    if (cover !== undefined) updateData.cover = cover

    // 添加更新时间
    updateData.updateTime = db.serverDate()

    // 4. 检查是否有更新字段
    if (Object.keys(updateData).length === 1) { // 只有updateTime
      return {
        success: false,
        error: '参数错误',
        message: '没有提供要更新的字段'
      }
    }

    // 5. 更新书籍信息
    const updateResult = await db.collection('books')
      .doc(bookId)
      .update({
        data: updateData
      })

    if (updateResult.stats.updated > 0) {
      return {
        success: true,
        bookId,
        updatedFields: Object.keys(updateData).filter(key => key !== 'updateTime'),
        message: '书籍信息更新成功'
      }
    } else {
      // 可能是书籍不存在或数据没有变化
      const bookExists = await db.collection('books').doc(bookId).get()
      if (!bookExists.data) {
        return {
          success: false,
          error: '书籍不存在',
          message: '指定的书籍不存在'
        }
      } else {
        return {
          success: false,
          error: '更新失败',
          message: '书籍信息未发生变化'
        }
      }
    }
  } catch (error) {
    console.error('更新书籍信息失败:', error)
    return {
      success: false,
      error: error.message,
      message: '更新书籍信息失败，请稍后重试'
    }
  }
}