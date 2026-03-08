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
  const adminOpenIds = ['opj1C3VBfI94VgN5A_H41qrzqRm0']
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
    // 尝试自动创建测试用户（方便开发测试）
    if (OPENID) {
      try {
        console.log('开发模式：自动创建测试用户，openid:', OPENID)

        // 生成随机匿名名
        const adjectives = ['爱读书的', '聪明的', '快乐的', '勇敢的', '好奇的', '勤奋的', '专注的']
        const animals = ['小熊猫', '小狐狸', '小海豚', '小猫咪', '小兔子', '小松鼠', '小刺猬']
        const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)]
        const randomAnimal = animals[Math.floor(Math.random() * animals.length)]
        const anonymousName = `${randomAdj}${randomAnimal}`

        // 创建用户数据
        const userData = {
          openid: OPENID,
          anonymousName: anonymousName,
          avatarIndex: Math.floor(Math.random() * 30), // 0-29随机头像
          role: 'student', // 默认学生角色
          grade: '三至四年级', // 默认年级
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
          },
          createTime: db.serverDate(),
          lastLoginTime: db.serverDate()
        }

        // 插入用户数据
        const addResult = await db.collection('users').add({
          data: userData
        })

        if (addResult._id) {
          console.log('测试用户创建成功，ID:', addResult._id)

          // 构建返回的用户信息
          const userInfo = {
            userId: addResult._id,
            anonymousName: userData.anonymousName,
            avatar: `/images/avatars/${userData.avatarIndex}.png`,
            role: userData.role,
            grade: userData.grade,
            points: userData.points,
            achievements: userData.achievements,
            readingStats: userData.readingStats,
            settings: userData.settings
          }

          const hasRequiredRole = checkRolePermission(userData.role, requiredRole)
          const permissions = rolePermissions[userData.role] || []

          return {
            success: true,
            isAdmin: false, // 不是管理员
            openid: OPENID,
            role: userData.role,
            hasRequiredRole: hasRequiredRole,
            permissions: permissions,
            userInfo: userInfo,
            message: '测试用户自动创建成功，您现在可以添加计划阅读书籍了'
          }
        }
      } catch (createError) {
        console.error('自动创建测试用户失败:', createError)
        // 创建失败，继续返回guest状态
      }
    }

    // 如果不是开发模式或创建失败，返回guest状态
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
      message: '用户未注册，请先完成匿名注册'
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