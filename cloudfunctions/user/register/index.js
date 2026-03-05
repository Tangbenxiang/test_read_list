// cloudfunctions/user/register/index.js
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

// 名字推荐算法
function generateRecommendedName() {
  // 形容词库 - 适合儿童阅读应用的正向形容词
  const adjectives = [
    '爱读书的', '聪明的', '快乐的', '好奇的', '勤奋的',
    '勇敢的', '友好的', '善良的', '活泼的', '安静的',
    '专注的', '有创意的', '爱思考的', '乐观的', '耐心的',
    '细心的', '热情的', '开朗的', '天真的', '可爱的'
  ]

  // 动物库 - 儿童喜欢的动物
  const animals = [
    '小熊猫', '小兔子', '小猫咪', '小狗', '小猴子',
    '小松鼠', '小鸟', '小海豚', '小企鹅', '小狐狸',
    '小熊', '小鹿', '小马', '小羊', '小鸡',
    '小鱼', '小乌龟', '小刺猬', '小青蛙', '小蝴蝶'
  ]

  // 随机选择形容词和动物
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const randomAnimal = animals[Math.floor(Math.random() * animals.length)]

  // 组合成名字
  return randomAdjective + randomAnimal
}

// 生成唯一的名字（检查是否已存在）
async function generateUniqueName(db) {
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    const recommendedName = generateRecommendedName()

    // 检查名字是否已存在
    const nameCheck = await db.collection('users')
      .where({ anonymousName: recommendedName })
      .get()

    if (nameCheck.data.length === 0) {
      return recommendedName
    }

    attempts++
    console.log(`名字"${recommendedName}"已存在，尝试重新生成 (${attempts}/${maxAttempts})`)
  }

  // 如果多次尝试都失败，返回带随机数后缀的名字
  const baseName = generateRecommendedName()
  const timestamp = Date.now().toString().slice(-4)
  return baseName + timestamp
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()
  const _ = db.command

  try {
    // 1. 验证参数
    const { anonymousName, avatarIndex, grade = '', role = 'student' } = event

    // 处理名字：如果为空则生成推荐名字
    let finalName = anonymousName ? anonymousName.trim() : ''

    if (finalName === '') {
      // 生成推荐名字
      finalName = await generateUniqueName(db)
      console.log(`为用户生成推荐名字: ${finalName}`)
    }

    // 验证名字长度
    if (finalName.length > 20) {
      return {
        success: false,
        code: 'NAME_TOO_LONG',
        message: '名字不能超过20个字符'
      }
    }

    // 验证头像索引 (0-29)
    const avatarIndexNum = parseInt(avatarIndex)
    if (isNaN(avatarIndexNum) || avatarIndexNum < 0 || avatarIndexNum > 29) {
      return {
        success: false,
        code: 'INVALID_AVATAR',
        message: '请选择有效的头像编号 (0-29)'
      }
    }

    // 验证角色
    const validRoles = ['student', 'parent', 'teacher', 'admin']
    if (!validRoles.includes(role)) {
      return {
        success: false,
        code: 'INVALID_ROLE',
        message: '请选择有效的身份'
      }
    }

    // 验证年级（如果是学生）
    const validGrades = ['一至二年级', '三至四年级', '五至六年级', 'grade1-2', 'grade3-4', 'grade5-6', 'middle-school', 'high-school']
    if (grade && !validGrades.includes(grade)) {
      return {
        success: false,
        code: 'INVALID_GRADE',
        message: '请选择有效的年级'
      }
    }

    // 2. 检查用户是否已注册
    const existingUserCheck = await db.collection('users')
      .where({ openid: OPENID })
      .get()

    if (existingUserCheck.data.length > 0) {
      return {
        success: false,
        code: 'ALREADY_REGISTERED',
        message: '您已经注册过了，无需重复注册',
        userInfo: existingUserCheck.data[0]
      }
    }

    // 3. 检查名字是否已存在（确保匿名名字唯一性）
    const nameCheck = await db.collection('users')
      .where({ anonymousName: finalName })
      .get()

    if (nameCheck.data.length > 0) {
      return {
        success: false,
        code: 'NAME_EXISTS',
        message: '这个名字已经被使用了，请换一个'
      }
    }

    // 4. 创建用户记录
    const userData = {
      openid: OPENID,
      anonymousName: finalName,
      avatarIndex: avatarIndexNum,
      role: role,
      grade: grade,
      points: 0,
      achievements: [],
      readingStats: {
        booksRead: 0,
        challengesCompleted: 0,
        totalReadingTime: 0,
        lastReadBookId: null,
        lastReadTime: null
      },
      settings: {
        privacyLevel: 'high',
        notificationEnabled: true,
        showReadingStats: true,
        showAchievements: true
      },
      createTime: db.serverDate(),
      lastLoginTime: db.serverDate(),
      updateTime: db.serverDate()
    }

    // 如果是管理员，需要额外检查（只能从现有管理员升级）
    if (role === 'admin') {
      const adminCheck = await db.collection('admins')
        .where({ openid: OPENID, role: 'admin' })
        .get()

      if (adminCheck.data.length === 0) {
        return {
          success: false,
          code: 'ADMIN_PERMISSION_DENIED',
          message: '管理员身份需要特殊授权'
        }
      }
    }

    const result = await db.collection('users').add({
      data: userData
    })

    console.log('用户注册成功:', { userId: result._id, anonymousName: userData.anonymousName })

    // 5. 构建返回的用户信息（不包含敏感信息）
    const userInfo = {
      userId: result._id,
      anonymousName: userData.anonymousName,
      avatar: `/images/avatars/${userData.avatarIndex}.png`,
      role: userData.role,
      grade: userData.grade,
      points: userData.points,
      achievements: userData.achievements,
      readingStats: userData.readingStats,
      settings: userData.settings
    }

    return {
      success: true,
      code: 'REGISTRATION_SUCCESS',
      message: '注册成功！欢迎加入阅读之旅',
      userId: result._id,
      userInfo: userInfo,
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('用户注册失败:', error)

    return {
      success: false,
      code: 'REGISTRATION_FAILED',
      message: '注册失败，请稍后重试',
      error: error.message
    }
  }
}