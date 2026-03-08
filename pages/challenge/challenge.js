// pages/challenge/challenge.js
const app = getApp()

Page({
  data: {
    // 挑战基本信息
    challenge: null,
    bookInfo: null,

    // 答题状态
    currentQuestionIndex: 0,
    currentQuestion: null, // 当前显示的问题
    currentUserAnswer: null, // 当前问题的用户答案
    userAnswers: {},
    showFeedback: false,
    feedbackMessage: '',
    isAnswerCorrect: false,

    // 提交状态
    isSubmitting: false,
    submissionResult: null,
    timeStarted: null,
    timeSpent: 0,

    // UI状态
    isLoading: true,
    errorMessage: '',
    showExplanation: false,
    explanationText: '',

    // 工具数据
    letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
  },

  onLoad(options) {
    const challengeId = options.challengeId
    if (!challengeId) {
      this.setData({
        isLoading: false,
        errorMessage: '未指定挑战ID'
      })
      wx.showToast({
        title: '参数错误',
        icon: 'error'
      })
      setTimeout(() => wx.navigateBack(), 2000)
      return
    }

    this.loadChallenge(challengeId)
    this.startTimer()
  },

  onUnload() {
    this.stopTimer()
  },

  // 加载挑战详情
  async loadChallenge(challengeId) {
    this.setData({ isLoading: true, errorMessage: '' })

    try {
      // 调用云函数获取挑战详情
      const result = await wx.cloud.callFunction({
        name: 'getDetail',
        data: {
          challengeId: challengeId
        }
      })

      if (result.result.success) {
        const challenge = result.result.challenge
        this.setData({
          challenge: challenge,
          bookInfo: challenge.bookInfo,
          currentQuestion: challenge.questions && challenge.questions.length > 0 ? challenge.questions[0] : null,
          isLoading: false
        })

        // 初始化用户答案对象
        const userAnswers = {}
        challenge.questions.forEach((q, index) => {
          userAnswers[index] = {
            questionId: q.questionId,
            type: q.type,
            value: null,
            isCorrect: false
          }
        })
        this.setData({ userAnswers, currentUserAnswer: userAnswers[0] })

      } else {
        throw new Error(result.result.message || '加载失败')
      }
    } catch (error) {
      console.error('加载挑战失败:', error)
      this.setData({
        isLoading: false,
        errorMessage: '加载挑战失败: ' + (error.message || '未知错误')
      })
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    }
  },

  // 计时器相关
  startTimer() {
    this.data.timeStarted = Date.now()
    this.timer = setInterval(() => {
      const timeSpent = Math.floor((Date.now() - this.data.timeStarted) / 1000)
      this.setData({ timeSpent })
    }, 1000)
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  // 选择题答案选择
  selectOption(e) {
    const { questionIndex, optionIndex } = e.currentTarget.dataset
    const question = this.data.challenge.questions[questionIndex]
    const userAnswers = this.data.userAnswers

    if (question.type === 'single_choice') {
      userAnswers[questionIndex].value = optionIndex
    } else if (question.type === 'multiple_choice') {
      // 多选：切换选中状态
      if (!userAnswers[questionIndex].value) {
        userAnswers[questionIndex].value = []
      }
      const currentValue = userAnswers[questionIndex].value
      const index = currentValue.indexOf(optionIndex)
      if (index > -1) {
        currentValue.splice(index, 1)
      } else {
        currentValue.push(optionIndex)
      }
    }

    this.setData({ userAnswers })

    // 自动验证答案（仅用于即时反馈）
    this.checkAnswer(questionIndex)
  },

  // 判断题答案选择
  selectTrueFalse(e) {
    const { questionIndex, value } = e.currentTarget.dataset
    const userAnswers = this.data.userAnswers
    userAnswers[questionIndex].value = value === 'true'
    this.setData({ userAnswers })

    this.checkAnswer(questionIndex)
  },

  // 简答题输入
  onShortAnswerInput(e) {
    const { questionIndex } = e.currentTarget.dataset
    const value = e.detail.value
    const userAnswers = this.data.userAnswers
    userAnswers[questionIndex].value = value
    this.setData({ userAnswers })
  },

  // 检查答案（即时反馈）
  checkAnswer(questionIndex) {
    const question = this.data.challenge.questions[questionIndex]
    const userAnswer = this.data.userAnswers[questionIndex].value
    const userAnswers = this.data.userAnswers

    // 注意：实际正确答案应该在服务器端验证
    // 这里仅提供即时反馈的占位逻辑
    let isCorrect = false
    let feedback = ''

    if (question.type === 'single_choice') {
      // 实际逻辑需要从服务器获取正确答案
      // 临时：假设第一个选项正确
      isCorrect = userAnswer === 0
      feedback = isCorrect ? '回答正确！' : '再思考一下哦'
    } else if (question.type === 'true_false') {
      // 临时：假设true正确
      isCorrect = userAnswer === true
      feedback = isCorrect ? '判断正确！' : '判断可能有误'
    } else if (question.type === 'short_answer') {
      // 简答题需要服务器端关键词匹配
      feedback = '答案已保存，提交后会有详细反馈'
      isCorrect = false // 简答题不能即时判断
    }

    userAnswers[questionIndex].isCorrect = isCorrect
    userAnswers[questionIndex].feedback = feedback

    this.setData({
      userAnswers,
      showFeedback: true,
      feedbackMessage: feedback,
      isAnswerCorrect: isCorrect
    })

    // 3秒后隐藏反馈
    setTimeout(() => {
      this.setData({ showFeedback: false })
    }, 3000)
  },

  // 显示题目解析
  showExplanation(questionIndex) {
    const question = this.data.challenge.questions[questionIndex]
    // 实际应从服务器获取解析内容
    const explanationText = question.explanation || '本题解析内容正在完善中...'
    this.setData({
      showExplanation: true,
      explanationText: explanationText
    })
  },

  hideExplanation() {
    this.setData({ showExplanation: false })
  },

  // 导航到上一题/下一题
  nextQuestion() {
    const nextIndex = this.data.currentQuestionIndex + 1
    if (nextIndex < this.data.challenge.questions.length) {
      this.setData({
        currentQuestionIndex: nextIndex,
        currentQuestion: this.data.challenge.questions[nextIndex],
        currentUserAnswer: this.data.userAnswers[nextIndex]
      })
    }
  },

  prevQuestion() {
    const prevIndex = this.data.currentQuestionIndex - 1
    if (prevIndex >= 0) {
      this.setData({
        currentQuestionIndex: prevIndex,
        currentQuestion: this.data.challenge.questions[prevIndex],
        currentUserAnswer: this.data.userAnswers[prevIndex]
      })
    }
  },

  // 提交挑战答案
  async submitChallenge() {
    const unansweredQuestions = Object.keys(this.data.userAnswers).filter(
      index => this.data.userAnswers[index].value === null ||
              (Array.isArray(this.data.userAnswers[index].value) &&
               this.data.userAnswers[index].value.length === 0)
    )

    if (unansweredQuestions.length > 0) {
      wx.showModal({
        title: '提示',
        content: `还有${unansweredQuestions.length}道题未回答，确定要提交吗？`,
        success: (res) => {
          if (res.confirm) {
            this.doSubmit()
          }
        }
      })
    } else {
      this.doSubmit()
    }
  },

  async doSubmit() {
    this.stopTimer()
    this.setData({ isSubmitting: true })

    const submissionData = {
      challengeId: this.data.challenge.challengeId,
      answers: Object.values(this.data.userAnswers).map(answer => ({
        questionId: answer.questionId,
        type: answer.type,
        value: answer.value
      })),
      timeSpent: this.data.timeSpent
    }

    try {
      const result = await wx.cloud.callFunction({
        name: 'submit',
        data: submissionData
      })

      if (result.result.success) {
        const submissionResult = result.result
        this.setData({
          submissionResult: submissionResult,
          isSubmitting: false
        })

        // 更新用户答案的正确状态（根据服务器返回的结果）
        const userAnswers = this.data.userAnswers
        if (submissionResult.questionResults) {
          submissionResult.questionResults.forEach((qResult, index) => {
            if (userAnswers[index]) {
              userAnswers[index].isCorrect = qResult.isCorrect
              userAnswers[index].feedback = qResult.feedback
            }
          })
          this.setData({ userAnswers })
        }

        wx.showToast({
          title: '提交成功！',
          icon: 'success'
        })

        // 显示积分奖励
        if (submissionResult.pointsEarned) {
          setTimeout(() => {
            wx.showModal({
              title: '挑战完成！',
              content: `恭喜您获得 ${submissionResult.pointsEarned} 积分！\n总分: ${submissionResult.totalScore}%`,
              showCancel: false,
              confirmText: '查看详情'
            })
          }, 1000)
        }

      } else {
        throw new Error(result.result.message || '提交失败')
      }
    } catch (error) {
      console.error('提交挑战失败:', error)
      this.setData({ isSubmitting: false })
      wx.showToast({
        title: '提交失败',
        icon: 'error'
      })
    }
  },

  // 返回挑战列表
  backToList() {
    wx.navigateBack()
  },

  // 重新尝试
  retryChallenge() {
    // 重置用户答案
    const userAnswers = this.data.userAnswers
    Object.keys(userAnswers).forEach(key => {
      userAnswers[key].value = null
      userAnswers[key].isCorrect = false
      userAnswers[key].feedback = ''
    })

    this.setData({
      userAnswers,
      currentQuestionIndex: 0,
      submissionResult: null,
      timeSpent: 0,
      showFeedback: false
    })

    this.startTimer()
  }
})