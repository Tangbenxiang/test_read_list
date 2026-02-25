// cloudfunctions/checkAdmin/index.js
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

  try {
    // 检查用户是否为管理员
    const result = await db.collection('admins')
      .where({
        openid: OPENID,
        role: 'admin'
      })
      .get()

    const isAdmin = result.data.length > 0

    if (isAdmin) {
      return {
        success: true,
        isAdmin: true,
        openid: OPENID,
        adminInfo: result.data[0]
      }
    } else {
      return {
        success: false,
        isAdmin: false,
        openid: OPENID,
        message: '用户不是管理员'
      }
    }
  } catch (error) {
    console.error('检查管理员权限失败:', error)
    return {
      success: false,
      isAdmin: false,
      openid: OPENID,
      error: error.message,
      message: '权限检查失败'
    }
  }
}