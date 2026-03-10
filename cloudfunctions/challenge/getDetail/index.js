// cloudfunctions/challenge/getDetail/index.js
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
    const { challengeId } = event

    if (!challengeId) {
      return {
        success: false,
        code: 'MISSING_CHALLENGE_ID',
        message: '缺少挑战ID参数'
      }
    }

    // 1. 获取挑战详情
    const challengeResult = await db.collection('weekly_challenges')
      .doc(challengeId)
      .get()

    if (!challengeResult.data) {
      return {
        success: false,
        code: 'CHALLENGE_NOT_FOUND',
        message: '挑战不存在或已被删除'
      }
    }

    const challenge = challengeResult.data

    // 2. 获取关联的书籍信息
    let bookInfo = null
    try {
      const bookResult = await db.collection('books')
        .doc(challenge.bookId)
        .get()

      if (bookResult.data) {
        bookInfo = {
          _id: bookResult.data._id,
          title: bookResult.data.title,
          author: bookResult.data.author,
          cover: bookResult.data.cover || '',
          gradeLevel: bookResult.data.gradeLevel || '',
          type: bookResult.data.type || ''
        }
      }
    } catch (bookError) {
      console.error('获取书籍信息失败:', bookError)
      bookInfo = { title: '未知书籍' }
    }

    // 3. 获取用户提交状态（如果已登录）
    let userStatus = { submitted: false }
    if (OPENID) {
      try {
        // 获取用户ID
        const userResult = await db.collection('users')
          .where({ openid: OPENID })
          .get()

        if (userResult.data.length > 0) {
          const userId = userResult.data[0]._id
          const responseResult = await db.collection('challenge_responses')
            .where({
              challengeId: challengeId,
              userId: userId
            })
            .get()

          if (responseResult.data.length > 0) {
            const response = responseResult.data[0]
            userStatus = {
              submitted: true,
              totalScore: response.totalScore,
              submittedAt: response.submittedAt,
              timeSpent: response.timeSpent,
              feedback: response.feedback
            }
          }
        }
      } catch (userError) {
        console.error('获取用户状态失败:', userError)
        // 不影响主要数据
      }
    }

    // 4. 安全处理：不暴露answerKey和正确答案信息
    const safeQuestions = challenge.questions ? challenge.questions.map((q, index) => ({
      questionId: q.questionId || index + 1,
      text: q.text,
      type: q.type,
      options: q.type === 'single_choice' || q.type === 'multiple_choice' ? q.options : undefined,
      points: q.points || 0,
      explanation: q.explanation || ''
      // 不包含正确答案
    })) : []

    // 5. 计算挑战状态和剩余时间
    const now = new Date()
    const startTime = new Date(challenge.startTime)
    const endTime = new Date(challenge.endTime)
    let status = challenge.status
    if (now >= startTime && now <= endTime) {
      status = 'active'
    } else if (now > endTime) {
      status = 'ended'
    } else if (now < startTime) {
      status = 'upcoming'
    }

    const daysRemaining = Math.ceil((endTime - now) / (1000 * 60 * 60 * 24))

    // 6. 构建响应数据
    const responseData = {
      challengeId: challenge._id,
      type: challenge.type,
      bookId: challenge.bookId,
      bookInfo: bookInfo,
      title: challenge.title,
      description: challenge.description || '',
      questions: safeQuestions,
      totalQuestions: safeQuestions.length,
      totalPoints: challenge.totalPoints || safeQuestions.reduce((sum, q) => sum + (q.points || 0), 0),
      weekNumber: challenge.weekNumber,
      year: challenge.year,
      startTime: challenge.startTime,
      endTime: challenge.endTime,
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
      status: status,
      difficulty: challenge.difficulty || 'medium',
      tags: challenge.tags || [],
      userStatus: userStatus,
      createTime: challenge.createTime
    }

    return {
      success: true,
      code: 'CHALLENGE_DETAIL_FETCHED',
      message: '挑战详情获取成功',
      challenge: responseData,
      timestamp: now.toISOString()
    }

  } catch (error) {
    console.error('获取挑战详情失败:', error)
    return {
      success: false,
      code: 'FETCH_DETAIL_FAILED',
      message: '获取挑战详情失败，请稍后重试',
      error: error.message
    }
  }
}