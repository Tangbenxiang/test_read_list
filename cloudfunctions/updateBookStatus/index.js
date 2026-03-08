// cloudfunctions/updateBookStatus/index.js
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
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()
  const { bookId, field, value } = event

  // 验证参数
  if (!bookId || !field) {
    return {
      success: false,
      error: '缺少必要参数: bookId和field'
    }
  }

  // 允许更新的字段
  const allowedFields = ['purchased', 'read', 'intensiveRead']
  if (!allowedFields.includes(field)) {
    return {
      success: false,
      error: `不允许更新字段: ${field}，允许的字段: ${allowedFields.join(', ')}`
    }
  }

  try {
    // 1. 检查权限：管理员或书籍添加者
    let hasPermission = false
    let isAdmin = false

    // 硬编码管理员OPENID检查
    const adminOpenIds = ['opj1C3VBfI94VgN5A_H41qrzqRm0']
    if (adminOpenIds.includes(OPENID)) {
      console.log('硬编码管理员OPENID检测到，赋予管理员权限:', OPENID)
      hasPermission = true
      isAdmin = true
    } else {
      // 检查是否为管理员
      const adminCheck = await db.collection('admins')
        .where({
          openid: OPENID,
          role: 'admin'
        })
        .get()

      if (adminCheck.data.length > 0) {
        hasPermission = true
        isAdmin = true
      } else {
        // 不是管理员，检查是否是书籍的添加者
        const bookRecord = await db.collection('books')
          .doc(bookId)
          .get()

        if (bookRecord.data) {
          const addedBy = bookRecord.data.addedBy
          if (addedBy && addedBy === OPENID) {
            hasPermission = true
            isAdmin = false
          }
        }
      }
    }

    if (!hasPermission) {
      return {
        success: false,
        error: '权限不足',
        message: '只有管理员或书籍添加者可以修改书籍状态'
      }
    }
    // 更新书籍状态
    const updateData = {
      [field]: value,
      updateTime: db.serverDate()
    }

    const result = await db.collection('books')
      .doc(bookId)
      .update({
        data: updateData
      })

    if (result.stats.updated === 0) {
      return {
        success: false,
        error: '未找到书籍或更新失败'
      }
    }

    return {
      success: true,
      message: '状态更新成功',
      data: updateData
    }
  } catch (error) {
    console.error('更新书籍状态失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}