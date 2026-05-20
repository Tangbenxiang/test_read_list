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
  const { requiredRole } = event

  // 硬编码管理员OPENID检查（不区分大小写）
  const normalizedOpenId = OPENID ? OPENID.toLowerCase() : ''
  const adminOpenIds = ['opj1C3VBfI94VgN5A_H41qrzqRm0', 'oaoLb4qz0R8STBj6ipGlHkfNCO2Q']
  const isHardcodedAdmin = adminOpenIds.includes(normalizedOpenId)

  // 调试日志：总是记录OPENID
  console.log('=== checkAdmin云函数开始执行 ===')
  console.log('当前用户OPENID:', OPENID)
  console.log('规范化OPENID:', normalizedOpenId)
  console.log('硬编码管理员OPENID列表:', adminOpenIds)
  console.log('OPENID匹配检查:', normalizedOpenId === 'opj1c3vbfi94vgn5a_h41qrzqrm0')
  console.log('OPENID长度:', OPENID ? OPENID.length : 0)
  console.log('硬编码OPENID长度:', 'opj1C3VBfI94VgN5A_H41qrzqRm0'.length)
  console.log('硬编码管理员检查结果:', isHardcodedAdmin)

  if (isHardcodedAdmin) {
    console.log('硬编码管理员OPENID检测到:', OPENID)
    // 返回管理员信息
    const userInfo = {
      anonymousName: '管理员',
      avatar: '/images/avatars/0.png',
      role: 'admin',
      points: 0,
      achievements: [],
      readingStats: {
        booksRead: 0,
        challengesCompleted: 0,
        totalReadingTime: 0
      },
      settings: {
        privacyLevel: 'high',
        notificationEnabled: true
      }
    }

    const rolePermissions = {
      admin: ['manage_books', 'manage_users', 'system_config', 'view_all_data']
    }

    const hasRequiredRole = requiredRole ? (requiredRole === 'admin' || (Array.isArray(requiredRole) && requiredRole.includes('admin'))) : true
    const permissions = rolePermissions['admin'] || []

    return {
      success: true,
      isAdmin: true,
      openid: OPENID,
      role: 'admin',
      hasRequiredRole: hasRequiredRole,
      permissions: permissions,
      userInfo: userInfo,
      message: '硬编码管理员身份验证成功'
    }
  }

  // 角色验证函数：检查用户角色是否匹配所需角色
  const checkRolePermission = (userRole, required) => {
    if (!required) return true // 未指定requiredRole则默认通过
    if (Array.isArray(required)) {
      return required.includes(userRole)
    }
    return userRole === required
  }

  // 角色权限映射
  const rolePermissions = {
    student: ['read_books', 'join_challenges', 'share_thoughts', 'earn_points'],
    parent: ['view_child_progress', 'manage_family', 'set_restrictions', 'receive_notifications'],
    teacher: ['view_class_progress', 'create_challenges', 'manage_students', 'generate_reports'],
    admin: ['manage_books', 'manage_users', 'system_config', 'view_all_data'],
    guest: ['browse_books', 'view_public_content']
  }

  try {
    // 1. 首先检查users集合（新的用户系统）
    try {
      const userResult = await db.collection('users')
        .where({ openid: OPENID })
        .get()

      if (userResult.data.length > 0) {
        const userData = userResult.data[0]
        const isAdminUser = userData.role === 'admin'

        // 构建返回的用户信息（不包含openid等敏感信息）
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
            notificationEnabled: true
          }
        }

        // 保持向后兼容：返回isAdmin字段
        const userRole = userData.role || 'guest'
        const hasRequiredRole = checkRolePermission(userRole, requiredRole)
        const permissions = rolePermissions[userRole] || []

        return {
          success: true,
          isAdmin: isAdminUser,
          openid: OPENID,
          role: userRole,
          hasRequiredRole: hasRequiredRole,
          permissions: permissions,
          userInfo: userInfo,
          message: '用户信息获取成功'
        }
      }
    } catch (userError) {
      // users集合可能不存在，继续检查admins集合
      console.log('users集合查询失败，可能尚未创建:', userError.message)
    }

    // 2. 如果users集合中没有，检查admins集合（向后兼容原有逻辑）
    try {
      const adminResult = await db.collection('admins')
        .where({
          openid: OPENID,
          role: 'admin'
        })
        .get()

      if (adminResult.data.length > 0) {
        const adminData = adminResult.data[0]

        // 为管理员创建基本用户信息
        const userInfo = {
          anonymousName: adminData.nickname || '管理员',
          avatar: '/images/avatars/0.png', // 默认头像
          role: 'admin',
          points: 0,
          achievements: [],
          readingStats: {
            booksRead: 0,
            challengesCompleted: 0,
            totalReadingTime: 0
          },
          settings: {
            privacyLevel: 'high',
            notificationEnabled: true
          }
        }

        const hasRequiredRole = checkRolePermission('admin', requiredRole)
        const permissions = rolePermissions['admin'] || []

        return {
          success: true,
          isAdmin: true,
          openid: OPENID,
          role: 'admin',
          hasRequiredRole: hasRequiredRole,
          permissions: permissions,
          userInfo: userInfo,
          adminInfo: adminData, // 保持原有字段
          message: '管理员身份验证成功'
        }
      }
    } catch (adminError) {
      console.error('admins集合查询失败:', adminError.message)
    }

    // 3. 如果两个集合中都没有找到用户
    // 不再自动创建用户，直接返回 guest 状态
    // 用户需通过注册页面走正规注册流程
    console.log('用户未在 users 和 admins 集合中找到，返回 guest 状态:', OPENID)

    const hasRequiredRole = checkRolePermission('guest', requiredRole)
    const permissions = rolePermissions['guest'] || []

    return {
      success: false,
      isAdmin: false,
      openid: OPENID,
      role: 'guest',
      hasRequiredRole: hasRequiredRole,
      permissions: permissions,
      userInfo: null,
      message: '用户未注册，请先完成注册'
    }

  } catch (error) {
    console.error('检查用户角色失败:', error)
    return {
      success: false,
      isAdmin: false,
      openid: OPENID,
      role: 'error',
      hasRequiredRole: false,
      permissions: [],
      userInfo: null,
      error: error.message,
      message: '权限检查失败，请稍后重试'
    }
  }
}