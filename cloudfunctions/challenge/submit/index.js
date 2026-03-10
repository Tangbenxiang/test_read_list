// cloudfunctions/challenge/submit/index.js
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

// 答案评分函数
function scoreAnswer(question, userAnswer) {
  const { type, points = 0 } = question

  if (userAnswer === null || userAnswer === undefined) {
    return { isCorrect: false, score: 0, feedback: '未回答' }
  }

  try {
    switch (type) {
      case 'single_choice': {
        const correctIndex = question.correctIndex
        const isCorrect = userAnswer === correctIndex
        return {
          isCorrect,
          score: isCorrect ? points : 0,
          feedback: isCorrect ? '回答正确！' : `正确答案是选项${String.fromCharCode(65 + correctIndex)}`
        }
      }

      case 'multiple_choice': {
        const correctIndices = question.correctIndices || []
        const userIndices = Array.isArray(userAnswer) ? userAnswer : []

        // 检查是否完全匹配（顺序无关）
        const isCorrect = correctIndices.length === userIndices.length &&
          correctIndices.every(idx => userIndices.includes(idx)) &&
          userIndices.every(idx => correctIndices.includes(idx))

        return {
          isCorrect,
          score: isCorrect ? points : 0,
          feedback: isCorrect ? '回答正确！' : `正确答案是选项${correctIndices.map(idx => String.fromCharCode(65 + idx)).join(', ')}`
        }
      }

      case 'true_false': {
        const correctAnswer = question.correctAnswer
        const isCorrect = userAnswer === correctAnswer
        return {
          isCorrect,
          score: isCorrect ? points : 0,
          feedback: isCorrect ? '判断正确！' : `正确答案是${correctAnswer ? '正确' : '错误'}`
        }
      }

      case 'short_answer': {
        const userText = String(userAnswer).trim().toLowerCase()
        const expectedKeywords = question.expectedKeywords || []

        if (expectedKeywords.length === 0) {
          // 没有关键词，需要人工评分
          return {
            isCorrect: false,
            score: 0,
            feedback: '简答题需要人工评分，请等待老师批改'
          }
        }

        // 检查是否包含关键词
        const matchedKeywords = expectedKeywords.filter(keyword =>
          userText.includes(keyword.toLowerCase())
        )

        const matchRatio = matchedKeywords.length / expectedKeywords.length
        const isCorrect = matchRatio >= 0.6 // 匹配60%以上的关键词视为正确
        const score = isCorrect ? points : Math.floor(points * matchRatio)

        return {
          isCorrect,
          score,
          feedback: matchedKeywords.length > 0
            ? `匹配到${matchedKeywords.length}个关键词`
            : '未匹配到关键词'
        }
      }

      default:
        return { isCorrect: false, score: 0, feedback: '未知题型' }
    }
  } catch (error) {
    console.error('评分出错:', error)
    return { isCorrect: false, score: 0, feedback: '评分过程中出错' }
  }
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()
  const _ = db.command
  const now = new Date()

  try {
    const { challengeId, answers, timeSpent = 0 } = event

    // 1. 验证参数
    if (!challengeId || !answers || !Array.isArray(answers)) {
      return {
        success: false,
        code: 'INVALID_PARAMS',
        message: '缺少必要参数：challengeId和answers'
      }
    }

    // 2. 获取挑战详情（包含正确答案）
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

    // 3. 检查挑战状态
    const startTime = new Date(challenge.startTime)
    const endTime = new Date(challenge.endTime)
    if (now < startTime) {
      return {
        success: false,
        code: 'CHALLENGE_NOT_STARTED',
        message: '挑战尚未开始'
      }
    }
    if (now > endTime) {
      return {
        success: false,
        code: 'CHALLENGE_ENDED',
        message: '挑战已结束'
      }
    }

    // 4. 获取用户信息
    const userResult = await db.collection('users')
      .where({ openid: OPENID })
      .get()

    if (userResult.data.length === 0) {
      return {
        success: false,
        code: 'USER_NOT_REGISTERED',
        message: '请先完成用户注册'
      }
    }

    const user = userResult.data[0]
    const userId = user._id

    // 5. 检查是否已提交过
    const existingResponse = await db.collection('challenge_responses')
      .where({
        challengeId: challengeId,
        userId: userId
      })
      .get()

    if (existingResponse.data.length > 0) {
      return {
        success: false,
        code: 'ALREADY_SUBMITTED',
        message: '您已经提交过本次挑战',
        previousResult: existingResponse.data[0]
      }
    }

    // 6. 获取正确答案（从answerKey或questions中）
    const answerKey = challenge.answerKey || []
    const questions = challenge.questions || []

    // 将answerKey映射到问题
    const questionMap = {}
    answerKey.forEach(key => {
      questionMap[key.questionId] = key
    })

    // 7. 评分
    const questionResults = []
    let totalScore = 0
    let totalPoints = 0
    let correctCount = 0

    answers.forEach((userAnswer, index) => {
      const question = questions.find(q => q.questionId === userAnswer.questionId) || questions[index]
      const correctInfo = questionMap[userAnswer.questionId] || questionMap[index + 1]

      if (!question) {
        questionResults.push({
          questionId: userAnswer.questionId,
          isCorrect: false,
          score: 0,
          feedback: '问题不存在'
        })
        return
      }

      // 合并正确答案信息
      const questionWithAnswer = {
        ...question,
        ...correctInfo
      }

      const result = scoreAnswer(questionWithAnswer, userAnswer.value)
      questionResults.push({
        questionId: userAnswer.questionId,
        userAnswer: userAnswer.value,
        correctAnswer: correctInfo,
        ...result
      })

      totalScore += result.score
      totalPoints += question.points || 0
      if (result.isCorrect) correctCount++
    })

    const finalScore = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0
    const correctRate = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0

    // 8. 计算积分奖励
    let pointsEarned = 0
    if (finalScore >= 90) {
      pointsEarned = Math.floor(challenge.totalPoints * 1.0) // 90%以上得满分
    } else if (finalScore >= 70) {
      pointsEarned = Math.floor(challenge.totalPoints * 0.7) // 70-89%得70%
    } else if (finalScore >= 50) {
      pointsEarned = Math.floor(challenge.totalPoints * 0.5) // 50-69%得50%
    } else {
      pointsEarned = Math.floor(challenge.totalPoints * 0.2) // 低于50%得20%
    }

    // 确保至少获得1积分
    pointsEarned = Math.max(1, pointsEarned)

    // 9. 创建挑战响应记录
    const responseData = {
      challengeId: challengeId,
      userId: userId,
      bookId: challenge.bookId,
      answers: answers,
      questionResults: questionResults,
      totalScore: finalScore,
      timeSpent: timeSpent,
      submittedAt: db.serverDate(),
      feedback: `正确率: ${correctRate}%，获得积分: ${pointsEarned}`,
      createTime: db.serverDate()
    }

    const responseResult = await db.collection('challenge_responses').add({
      data: responseData
    })

    // 10. 更新用户积分和阅读统计
    const newPoints = (user.points || 0) + pointsEarned
    const newReadingStats = {
      ...user.readingStats,
      challengesCompleted: (user.readingStats?.challengesCompleted || 0) + 1,
      lastChallengeId: challengeId,
      lastChallengeTime: db.serverDate()
    }

    await db.collection('users').doc(userId).update({
      data: {
        points: newPoints,
        readingStats: newReadingStats,
        updateTime: db.serverDate()
      }
    })

    // 11. 记录挑战完成次数（可选）
    try {
      await db.collection('weekly_challenges').doc(challengeId).update({
        data: {
          completedCount: _.inc(1),
          updateTime: db.serverDate()
        }
      })
    } catch (error) {
      console.error('更新挑战完成次数失败:', error)
      // 不影响主要流程
    }

    console.log('挑战提交成功:', {
      userId,
      challengeId,
      finalScore,
      pointsEarned
    })

    // 12. 返回结果
    return {
      success: true,
      code: 'SUBMISSION_SUCCESS',
      message: '挑战提交成功！',
      submissionId: responseResult._id,
      totalScore: finalScore,
      correctRate: correctRate,
      correctCount: correctCount,
      totalQuestions: questions.length,
      pointsEarned: pointsEarned,
      newTotalPoints: newPoints,
      questionResults: questionResults.map(r => ({
        questionId: r.questionId,
        isCorrect: r.isCorrect,
        score: r.score,
        feedback: r.feedback
      })),
      timeSpent: timeSpent,
      submittedAt: responseData.submittedAt,
      timestamp: now.toISOString()
    }

  } catch (error) {
    console.error('提交挑战失败:', error)
    return {
      success: false,
      code: 'SUBMISSION_FAILED',
      message: '提交失败，请稍后重试',
      error: error.message
    }
  }
}