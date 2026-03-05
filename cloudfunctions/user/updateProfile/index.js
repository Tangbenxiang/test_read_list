// cloudfunctions/user/updateProfile/index.js
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

  try {
    // 1. 验证参数
    const {
      grade,           // 可选：更新年级
      settings,        // 可选：更新设置
      avatarIndex      // 可选：更新头像索引 (0-29)
    } = event

    // 2. 构建更新对象
    const updateData = {}
    const updateTime = db.serverDate()

    // 验证并添加年级更新
    if (grade !== undefined) {
      const validGrades = ['', 'grade1-2', 'grade3-4', 'grade5-6', 'middle-school', 'high-school']
      if (!validGrades.includes(grade)) {
        return {
          success: false,
          code: 'INVALID_GRADE',
          message: '请选择有效的年级'
        }
      }
      updateData.grade = grade
    }

    // 验证并添加头像索引更新
    if (avatarIndex !== undefined) {
      const avatarIndexNum = parseInt(avatarIndex)
      if (isNaN(avatarIndexNum) || avatarIndexNum < 0 || avatarIndexNum > 29) {
        return {
          success: false,
          code: 'INVALID_AVATAR',
          message: '请选择有效的头像编号 (0-29)'
        }
      }
      updateData.avatarIndex = avatarIndexNum
    }

    // 验证并添加设置更新
    if (settings !== undefined && typeof settings === 'object') {
      // 合并设置，保留原有未提供的字段
      updateData.settings = _.set({
        privacyLevel: settings.privacyLevel || 'high',
        notificationEnabled: settings.notificationEnabled !== undefined ? settings.notificationEnabled : true,
        showReadingStats: settings.showReadingStats !== undefined ? settings.showReadingStats : true,
        showAchievements: settings.showAchievements !== undefined ? settings.showAchievements : true
      })
    }

    // 如果没有可更新的字段
    if (Object.keys(updateData).length === 0) {
      return {
        success: false,
        code: 'NO_UPDATE_DATA',
        message: '没有提供可更新的字段'
      }
    }

    // 3. 添加更新时间
    updateData.updateTime = updateTime

    // 4. 执行更新
    const result = await db.collection('users')
      .where({ openid: OPENID })
      .update({
        data: updateData
      })

    if (result.stats.updated === 0) {
      return {
        success: false,
        code: 'USER_NOT_FOUND',
        message: '用户未找到，请先完成注册'
      }
    }

    // 5. 获取更新后的用户信息
    const updatedUser = await db.collection('users')
      .where({ openid: OPENID })
      .get()

    const userData = updatedUser.data[0]

    // 构建返回的用户信息
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
      }
    }

    console.log('用户信息更新成功:', { openid: OPENID, updatedFields: Object.keys(updateData) })

    return {
      success: true,
      code: 'PROFILE_UPDATED',
      message: '用户信息更新成功',
      userInfo: userInfo,
      updatedFields: Object.keys(updateData),
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('更新用户信息失败:', error)

    return {
      success: false,
      code: 'PROFILE_UPDATE_FAILED',
      message: '更新用户信息失败，请稍后重试',
      error: error.message
    }
  }
}