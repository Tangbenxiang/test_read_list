// cloudfunctions/user/getProfile/index.js
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
    // 1. 查询用户信息
    const userResult = await db.collection('users')
      .where({ openid: OPENID })
      .get()

    if (userResult.data.length === 0) {
      return {
        success: false,
        code: 'USER_NOT_FOUND',
        message: '用户未找到，请先完成注册',
        userInfo: null
      }
    }

    const userData = userResult.data[0]

    // 2. 构建返回的用户信息（不包含敏感信息）
    const userInfo = {
      userId: userData._id,
      anonymousName: userData.anonymousName,
      avatar: `/images/avatars/${userData.avatarIndex}.png`,
      role: userData.role,
      grade: userData.grade || '',
      points: userData.points || 0,
      achievements: userData.achievements || [],
      readingStats: userData.readingStats || {
        booksRead: 0,
        challengesCompleted: 0,
        totalReadingTime: 0
      },
      settings: userData.settings || {
        privacyLevel: 'high',
        notificationEnabled: true,
        showReadingStats: true,
        showAchievements: true
      },
      createTime: userData.createTime,
      lastLoginTime: userData.lastLoginTime
    }

    // 3. 获取用户相关的活动记录（可选，可后续扩展）
    // 例如：最近完成的挑战、分享等

    return {
      success: true,
      code: 'PROFILE_FETCHED',
      message: '用户信息获取成功',
      userInfo: userInfo,
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('获取用户信息失败:', error)

    return {
      success: false,
      code: 'PROFILE_FETCH_FAILED',
      message: '获取用户信息失败，请稍后重试',
      error: error.message,
      userInfo: null
    }
  }
}