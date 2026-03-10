// cloudfunctions/challenge/getWeekly/index.js
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
  const now = new Date()

  try {
    // 可选参数：是否包含用户提交状态
    const { includeUserStatus = true, limit = 10 } = event

    // 1. 查找本周的活动挑战
    // 本周定义为status为'active'，或者当前时间在startTime和endTime之间
    const weeklyChallenges = await db.collection('weekly_challenges')
      .where(_.or([
        { status: 'active' },
        {
          startTime: _.lte(now),
          endTime: _.gte(now)
        }
      ]))
      .orderBy('startTime', 'asc')
      .limit(limit)
      .get()

    if (weeklyChallenges.data.length === 0) {
      return {
        success: true,
        code: 'NO_CHALLENGES',
        message: '本周没有可用的挑战',
        challenges: [],
        timestamp: now.toISOString()
      }
    }

    // 2. 获取关联的书籍信息
    const bookIds = [...new Set(weeklyChallenges.data.map(c => c.bookId))]
    const booksResult = await db.collection('books')
      .where({
        _id: _.in(bookIds)
      })
      .get()

    const bookMap = {}
    booksResult.data.forEach(book => {
      bookMap[book._id] = {
        _id: book._id,
        title: book.title,
        author: book.author,
        cover: book.cover,
        gradeLevel: book.gradeLevel,
        type: book.type
      }
    })

    // 3. 获取用户提交状态（如果需要）
    let userResponses = {}
    if (includeUserStatus && OPENID) {
      try {
        // 先获取用户ID
        const userResult = await db.collection('users')
          .where({ openid: OPENID })
          .get()

        if (userResult.data.length > 0) {
          const userId = userResult.data[0]._id
          const challengeIds = weeklyChallenges.data.map(c => c._id)

          const responsesResult = await db.collection('challenge_responses')
            .where({
              challengeId: _.in(challengeIds),
              userId: userId
            })
            .get()

          responsesResult.data.forEach(response => {
            userResponses[response.challengeId] = {
              submitted: true,
              totalScore: response.totalScore,
              submittedAt: response.submittedAt,
              timeSpent: response.timeSpent
            }
          })
        }
      } catch (userError) {
        console.error('获取用户提交状态失败:', userError)
        // 不影响主要功能，继续执行
      }
    }

    // 4. 构建响应数据
    const challenges = weeklyChallenges.data.map(challenge => {
      const bookInfo = bookMap[challenge.bookId] || { title: '未知书籍' }
      const userStatus = userResponses[challenge._id] || { submitted: false }

      // 计算剩余时间
      const endTime = new Date(challenge.endTime)
      const timeRemaining = endTime - now
      const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24))

      // 安全处理：不暴露answerKey和正确答案信息
      const safeQuestions = challenge.questions ? challenge.questions.map(q => ({
        questionId: q.questionId,
        text: q.text,
        type: q.type,
        options: q.type === 'single_choice' || q.type === 'multiple_choice' ? q.options : undefined,
        points: q.points,
        // 不包含正确答案
      })) : []

      return {
        challengeId: challenge._id,
        type: challenge.type,
        bookId: challenge.bookId,
        bookInfo: bookInfo,
        title: challenge.title,
        description: challenge.description,
        questions: safeQuestions,
        totalQuestions: safeQuestions.length,
        totalPoints: challenge.totalPoints || safeQuestions.reduce((sum, q) => sum + (q.points || 0), 0),
        weekNumber: challenge.weekNumber,
        year: challenge.year,
        startTime: challenge.startTime,
        endTime: challenge.endTime,
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        status: challenge.status,
        difficulty: challenge.difficulty,
        tags: challenge.tags || [],
        userStatus: userStatus,
        createTime: challenge.createTime
      }
    })

    // 5. 按状态和开始时间排序
    challenges.sort((a, b) => {
      // 首先按状态排序：active > upcoming > ended
      const statusOrder = { active: 0, upcoming: 1, ended: 2 }
      const statusDiff = (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3)
      if (statusDiff !== 0) return statusDiff

      // 然后按开始时间排序（最近的在前）
      return new Date(a.startTime) - new Date(b.startTime)
    })

    return {
      success: true,
      code: 'WEEKLY_CHALLENGES_FETCHED',
      message: '本周挑战获取成功',
      challenges: challenges,
      totalCount: challenges.length,
      timestamp: now.toISOString()
    }

  } catch (error) {
    console.error('获取本周挑战失败:', error)
    return {
      success: false,
      code: 'FETCH_CHALLENGES_FAILED',
      message: '获取挑战失败，请稍后重试',
      error: error.message
    }
  }
}