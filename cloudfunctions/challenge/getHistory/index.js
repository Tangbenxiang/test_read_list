// cloudfunctions/challenge/getHistory/index.js
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

// 按周分组函数
function groupByWeek(challenges) {
  const groups = {}

  challenges.forEach(challenge => {
    const weekKey = `第${challenge.weekNumber || 0}周`
    if (!groups[weekKey]) {
      groups[weekKey] = {
        weekNumber: challenge.weekNumber,
        year: challenge.year,
        startTime: challenge.startTime,
        endTime: challenge.endTime,
        challenges: []
      }
    }
    groups[weekKey].challenges.push(challenge)
  })

  // 转换为数组并按周数降序排序（最近的在前）
  return Object.values(groups).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return b.weekNumber - a.weekNumber
  })
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()
  const _ = db.command
  const now = new Date()

  try {
    // 参数：分页和过滤
    const {
      page = 1,
      pageSize = 20,
      status = 'ended',
      year = null,
      includeUserStatus = true
    } = event

    const skip = (page - 1) * pageSize

    // 1. 构建查询条件
    let query = db.collection('weekly_challenges')

    // 状态过滤：默认只获取已结束的挑战
    if (status) {
      query = query.where({ status: status })
    } else {
      // 如果没有指定状态，获取所有非活动挑战
      query = query.where({
        status: _.in(['ended', 'upcoming'])
      })
    }

    // 年份过滤
    if (year) {
      query = query.where({ year: year })
    }

    // 2. 获取挑战列表（按结束时间降序）
    const challengesResult = await query
      .orderBy('endTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()

    const totalResult = await query.count()
    const total = totalResult.total

    if (challengesResult.data.length === 0) {
      return {
        success: true,
        code: 'NO_HISTORY_CHALLENGES',
        message: '暂无历史挑战记录',
        weeklyGroups: [],
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        },
        timestamp: now.toISOString()
      }
    }

    // 3. 获取关联的书籍信息
    const bookIds = [...new Set(challengesResult.data.map(c => c.bookId))]
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

    // 4. 获取用户提交状态（如果需要）
    let userResponses = {}
    if (includeUserStatus && OPENID) {
      try {
        // 先获取用户ID
        const userResult = await db.collection('users')
          .where({ openid: OPENID })
          .get()

        if (userResult.data.length > 0) {
          const userId = userResult.data[0]._id
          const challengeIds = challengesResult.data.map(c => c._id)

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
              timeSpent: response.timeSpent,
              feedback: response.feedback
            }
          })
        }
      } catch (userError) {
        console.error('获取用户提交状态失败:', userError)
        // 不影响主要功能，继续执行
      }
    }

    // 5. 构建挑战数据
    const challenges = challengesResult.data.map(challenge => {
      const bookInfo = bookMap[challenge.bookId] || { title: '未知书籍' }
      const userStatus = userResponses[challenge._id] || { submitted: false }

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
        totalQuestions: safeQuestions.length,
        totalPoints: challenge.totalPoints || safeQuestions.reduce((sum, q) => sum + (q.points || 0), 0),
        weekNumber: challenge.weekNumber,
        year: challenge.year,
        startTime: challenge.startTime,
        endTime: challenge.endTime,
        status: challenge.status,
        difficulty: challenge.difficulty,
        tags: challenge.tags || [],
        userStatus: userStatus,
        createTime: challenge.createTime,
        // 计算挑战持续时间（天）
        durationDays: Math.ceil((new Date(challenge.endTime) - new Date(challenge.startTime)) / (1000 * 60 * 60 * 24))
      }
    })

    // 6. 按周分组
    const weeklyGroups = groupByWeek(challenges)

    // 7. 为每组计算统计信息
    weeklyGroups.forEach(group => {
      group.totalChallenges = group.challenges.length
      group.completedChallenges = group.challenges.filter(c => c.userStatus.submitted).length
      group.completionRate = group.totalChallenges > 0
        ? Math.round((group.completedChallenges / group.totalChallenges) * 100)
        : 0

      // 计算平均得分
      const submittedChallenges = group.challenges.filter(c => c.userStatus.submitted && c.userStatus.totalScore !== undefined)
      group.averageScore = submittedChallenges.length > 0
        ? Math.round(submittedChallenges.reduce((sum, c) => sum + c.userStatus.totalScore, 0) / submittedChallenges.length)
        : 0

      // 确定时间段
      if (group.challenges.length > 0) {
        const startTimes = group.challenges.map(c => new Date(c.startTime))
        const endTimes = group.challenges.map(c => new Date(c.endTime))
        group.periodStart = new Date(Math.min(...startTimes)).toISOString()
        group.periodEnd = new Date(Math.max(...endTimes)).toISOString()
      }
    })

    return {
      success: true,
      code: 'HISTORY_CHALLENGES_FETCHED',
      message: '历史挑战获取成功',
      weeklyGroups: weeklyGroups,
      challenges: challenges, // 扁平化列表，用于兼容性
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page * pageSize < total
      },
      timestamp: now.toISOString()
    }

  } catch (error) {
    console.error('获取历史挑战失败:', error)
    return {
      success: false,
      code: 'FETCH_HISTORY_FAILED',
      message: '获取历史挑战失败，请稍后重试',
      error: error.message
    }
  }
}