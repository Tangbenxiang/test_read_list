// cloudfunctions/challenge/create/index.js
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
      bookId,
      title,
      description = '',
      questions,
      weekNumber,
      year = new Date().getFullYear(),
      startTime,
      endTime,
      difficulty = 'medium',
      tags = [],
      type = 'weekly'
    } = event

    // 必填字段验证
    if (!bookId || !title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return {
        success: false,
        code: 'INVALID_PARAMS',
        message: '缺少必填参数：bookId、title、questions（至少一个问题）'
      }
    }

    // 验证时间
    const startDate = new Date(startTime)
    const endDate = new Date(endTime)
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
      return {
        success: false,
        code: 'INVALID_TIME',
        message: '请提供有效的开始和结束时间，且结束时间需晚于开始时间'
      }
    }

    // 验证问题结构
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]
      if (!question.text || !question.type) {
        return {
          success: false,
          code: 'INVALID_QUESTION',
          message: `第${i + 1}个问题缺少text或type字段`
        }
      }

      // 根据问题类型验证选项
      if (question.type === 'single_choice' || question.type === 'multiple_choice') {
        if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
          return {
            success: false,
            code: 'INVALID_OPTIONS',
            message: `第${i + 1}个选择题缺少有效的options数组`
          }
        }
        if (typeof question.correctIndex === 'undefined' && !question.correctIndices) {
          return {
            success: false,
            code: 'MISSING_CORRECT_ANSWER',
            message: `第${i + 1}个选择题缺少正确答案标识`
          }
        }
      } else if (question.type === 'true_false') {
        if (typeof question.correctAnswer !== 'boolean') {
          return {
            success: false,
            code: 'INVALID_TRUE_FALSE',
            message: `第${i + 1}个判断题缺少正确的correctAnswer布尔值`
          }
        }
      } else if (question.type === 'short_answer') {
        if (!question.expectedKeywords || !Array.isArray(question.expectedKeywords)) {
          return {
            success: false,
            code: 'INVALID_SHORT_ANSWER',
            message: `第${i + 1}个简答题缺少expectedKeywords数组`
          }
        }
      } else {
        return {
          success: false,
          code: 'UNKNOWN_QUESTION_TYPE',
          message: `第${i + 1}个问题类型不支持：${question.type}`
        }
      }

      // 验证分数
      if (typeof question.points !== 'number' || question.points <= 0) {
        return {
          success: false,
          code: 'INVALID_POINTS',
          message: `第${i + 1}个问题缺少有效的points分数`
        }
      }
    }

    // 2. 检查管理员/教师权限
    try {
      const authResult = await cloud.callFunction({
        name: 'checkAdmin',
        data: {
          requiredRole: ['admin', 'teacher']
        }
      })

      if (!authResult.result.success || !authResult.result.hasRequiredRole) {
        return {
          success: false,
          code: 'PERMISSION_DENIED',
          message: '只有管理员或教师可以创建挑战'
        }
      }
    } catch (authError) {
      console.error('权限检查失败:', authError)
      return {
        success: false,
        code: 'AUTH_CHECK_FAILED',
        message: '权限验证失败，请稍后重试'
      }
    }

    // 3. 检查书籍是否存在
    try {
      const bookResult = await db.collection('books').doc(bookId).get()
      if (!bookResult.data) {
        return {
          success: false,
          code: 'BOOK_NOT_FOUND',
          message: '指定的书籍不存在'
        }
      }
    } catch (bookError) {
      console.error('书籍查询失败:', bookError)
      return {
        success: false,
        code: 'BOOK_QUERY_FAILED',
        message: '书籍信息查询失败'
      }
    }

    // 4. 计算挑战状态
    const now = new Date()
    let status = 'upcoming'
    if (now >= startDate && now <= endDate) {
      status = 'active'
    } else if (now > endDate) {
      status = 'ended'
    }

    // 5. 创建挑战记录
    const challengeData = {
      type: type,
      bookId: bookId,
      title: title.trim(),
      description: description.trim(),
      questions: questions.map((q, index) => ({
        ...q,
        questionId: index + 1,
        // 移除正确答案信息，不存储到客户端可访问的数据中
        // 正确答案信息存储在单独的安全字段中，或者通过评分函数处理
      })),
      // 存储正确答案用于评分（不暴露给客户端）
      answerKey: questions.map((q, index) => {
        const key = { questionId: index + 1, type: q.type }
        if (q.type === 'single_choice' || q.type === 'multiple_choice') {
          key.correctIndex = q.correctIndex
          key.correctIndices = q.correctIndices
        } else if (q.type === 'true_false') {
          key.correctAnswer = q.correctAnswer
        } else if (q.type === 'short_answer') {
          key.expectedKeywords = q.expectedKeywords
          key.expectedLength = q.expectedLength
        }
        return key
      }),
      weekNumber: weekNumber,
      year: year,
      startTime: startDate,
      endTime: endDate,
      status: status,
      difficulty: difficulty,
      createdBy: OPENID,
      tags: tags,
      totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }

    const result = await db.collection('weekly_challenges').add({
      data: challengeData
    })

    console.log('挑战创建成功:', { challengeId: result._id, title: challengeData.title })

    // 6. 返回创建结果（不包含answerKey）
    const responseData = {
      challengeId: result._id,
      type: challengeData.type,
      bookId: challengeData.bookId,
      title: challengeData.title,
      description: challengeData.description,
      questions: challengeData.questions.map(q => ({
        questionId: q.questionId,
        text: q.text,
        type: q.type,
        options: q.options,
        points: q.points,
        // 不包含正确答案信息
      })),
      weekNumber: challengeData.weekNumber,
      year: challengeData.year,
      startTime: challengeData.startTime,
      endTime: challengeData.endTime,
      status: challengeData.status,
      difficulty: challengeData.difficulty,
      tags: challengeData.tags,
      totalPoints: challengeData.totalPoints,
      createTime: challengeData.createTime
    }

    return {
      success: true,
      code: 'CHALLENGE_CREATED',
      message: '挑战创建成功',
      challengeId: result._id,
      challenge: responseData,
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('创建挑战失败:', error)
    return {
      success: false,
      code: 'CHALLENGE_CREATION_FAILED',
      message: '挑战创建失败，请稍后重试',
      error: error.message
    }
  }
}