// pages/register/register.js
Page({
  data: {
    // 用户状态
    userStatus: 'checking', // checking, guest, registered
    openid: '',

    // 表单数据
    selectedName: '',
    selectedAvatarIndex: 0,
    selectedGrade: '',
    selectedRole: 'student',
    customName: '',

    // 名字推荐
    nameRecommendations: [],
    adjectives: ['爱读书的', '聪明的', '快乐的', '勇敢的', '好奇的', '勤奋的', '专注的', '善良的', '活泼的', '安静的'],
    animals: ['小熊猫', '小狐狸', '小海豚', '小猫咪', '小兔子', '小松鼠', '小刺猬', '小鹿', '小鸟', '小鱼'],

    // 头像选项 (30个预设头像，路径占位符)
    avatars: [],

    // 年级选项
    grades: [
      { value: '', label: '不选择年级' },
      { value: 'grade1-2', label: '一至二年级' },
      { value: 'grade3-4', label: '三至四年级' },
      { value: 'grade5-6', label: '五至六年级' },
      { value: 'middle-school', label: '初中' },
      { value: 'high-school', label: '高中' }
    ],

    // 角色选项
    roles: [
      { value: 'student', label: '学生' },
      { value: 'parent', label: '家长' },
      { value: 'teacher', label: '老师' }
    ],

    // UI状态
    loading: false,
    showCustomNameInput: false,

    // 显示文本
    selectedGradeLabel: '不选择年级',
    selectedRoleLabel: '学生'
  },

  onLoad() {
    this.checkUserStatus()
    this.generateNameRecommendations()
    this.generateAvatarList()
  },

  // 检查用户状态
  async checkUserStatus() {
    this.setData({ loading: true, userStatus: 'checking' })
    const app = getApp()

    // 优先使用全局用户信息
    if (app.globalData.loginStatus === 'loggedIn' && app.globalData.userInfo) {
      // 已注册用户，跳转到首页
      wx.showToast({
        title: '您已完成注册，正在跳转首页',
        icon: 'success',
        duration: 1500
      })

      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        })
      }, 1500)
      return
    }

    // 如果全局状态是guest，显示注册表单
    if (app.globalData.loginStatus === 'guest') {
      this.setData({
        userStatus: 'guest',
        openid: app.globalData.openid || '',
        loading: false
      })
      return
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'checkAdmin'
      })

      console.log('用户状态检查结果:', res.result)

      if (res.result && res.result.success) {
        const { role, userInfo, openid } = res.result

        if (role === 'guest') {
          // 更新全局状态
          app.globalData.loginStatus = 'guest'
          app.globalData.openid = openid
          // 新用户，显示注册表单
          this.setData({
            userStatus: 'guest',
            openid: openid,
            loading: false
          })
        } else {
          // 更新全局状态
          app.globalData.userInfo = userInfo
          app.globalData.loginStatus = 'loggedIn'
          // 已注册用户，跳转到首页
          wx.showToast({
            title: '您已完成注册，正在跳转首页',
            icon: 'success',
            duration: 1500
          })

          setTimeout(() => {
            wx.switchTab({
              url: '/pages/index/index'
            })
          }, 1500)
        }
      } else {
        // 检查失败，显示错误
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'error',
          duration: 2000
        })
        this.setData({ loading: false })
      }
    } catch (error) {
      console.error('检查用户状态失败:', error)
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'error',
        duration: 2000
      })
      this.setData({ loading: false })
    }
  },

  // 生成名字推荐
  generateNameRecommendations() {
    const recommendations = []

    // 生成3个推荐名字
    for (let i = 0; i < 3; i++) {
      const adjIndex = Math.floor(Math.random() * this.data.adjectives.length)
      const animalIndex = Math.floor(Math.random() * this.data.animals.length)
      const name = `${this.data.adjectives[adjIndex]}${this.data.animals[animalIndex]}`
      recommendations.push(name)
    }

    // 如果推荐名字中有重复，重新生成
    const uniqueRecommendations = [...new Set(recommendations)]
    while (uniqueRecommendations.length < 3) {
      const adjIndex = Math.floor(Math.random() * this.data.adjectives.length)
      const animalIndex = Math.floor(Math.random() * this.data.animals.length)
      const name = `${this.data.adjectives[adjIndex]}${this.data.animals[animalIndex]}`
      if (!uniqueRecommendations.includes(name)) {
        uniqueRecommendations.push(name)
      }
    }

    this.setData({
      nameRecommendations: uniqueRecommendations,
      selectedName: uniqueRecommendations[0]
    })
  },

  // 生成头像列表
  generateAvatarList() {
    const avatars = []
    for (let i = 0; i < 30; i++) {
      avatars.push({
        index: i,
        path: `/images/avatars/${i}.png`, // 实际图片路径
      })
    }
    this.setData({ avatars })
  },

  // 选择推荐名字
  selectName(e) {
    const name = e.currentTarget.dataset.name
    this.setData({
      selectedName: name,
      showCustomNameInput: false
    })
  },

  // 切换自定义名字输入
  toggleCustomNameInput() {
    this.setData({
      showCustomNameInput: !this.data.showCustomNameInput,
      selectedName: this.data.customName || ''
    })
  },

  // 输入自定义名字
  onCustomNameInput(e) {
    const name = e.detail.value.trim()
    this.setData({
      customName: name,
      selectedName: name
    })
  },

  // 选择头像
  selectAvatar(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    this.setData({ selectedAvatarIndex: index })
  },

  // 选择年级
  onGradeChange(e) {
    const value = e.detail.value
    const gradeObj = this.data.grades.find(g => g.value === value) || { label: '不选择年级' }
    this.setData({
      selectedGrade: value,
      selectedGradeLabel: gradeObj.label
    })
  },

  // 选择角色
  onRoleChange(e) {
    const value = e.detail.value
    const roleObj = this.data.roles.find(r => r.value === value) || { label: '学生' }
    this.setData({
      selectedRole: value,
      selectedRoleLabel: roleObj.label
    })
  },

  // 提交注册
  async submitRegistration() {
    // 验证表单
    if (!this.data.selectedName || this.data.selectedName.trim() === '') {
      wx.showToast({
        title: '请选择或输入名字',
        icon: 'error',
        duration: 2000
      })
      return
    }

    // 检查名字长度
    if (this.data.selectedName.length > 20) {
      wx.showToast({
        title: '名字不能超过20个字符',
        icon: 'error',
        duration: 2000
      })
      return
    }

    // 检查头像索引是否有效（0-29）
    if (this.data.selectedAvatarIndex < 0 || this.data.selectedAvatarIndex > 29) {
      wx.showToast({
        title: '请选择有效的头像',
        icon: 'error',
        duration: 2000
      })
      return
    }

    this.setData({ loading: true })

    try {
      // 调用注册云函数
      const res = await wx.cloud.callFunction({
        name: 'user/register',
        data: {
          anonymousName: this.data.selectedName,
          avatarIndex: this.data.selectedAvatarIndex,
          grade: this.data.selectedGrade,
          role: this.data.selectedRole
        }
      })

      if (res.result && res.result.success) {
        wx.showToast({
          title: '注册成功！',
          icon: 'success',
          duration: 1500
        })

        // 注册成功，跳转到首页
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          })
        }, 1500)
      } else {
        // 错误码到友好消息的映射
        const errorMessages = {
          'NAME_TOO_LONG': '名字不能超过20个字符',
          'INVALID_AVATAR': '请选择有效的头像编号 (0-29)',
          'INVALID_ROLE': '请选择有效的身份',
          'INVALID_GRADE': '请选择有效的年级',
          'ALREADY_REGISTERED': '您已经注册过了，无需重复注册',
          'NAME_EXISTS': '这个名字已经被使用了，请换一个',
          'ADMIN_PERMISSION_DENIED': '管理员身份需要特殊授权',
          'REGISTRATION_FAILED': '注册失败，请稍后重试'
        }

        const errorCode = res.result.code
        const errorMessage = errorMessages[errorCode] || res.result.message || '注册失败，请重试'

        wx.showToast({
          title: errorMessage,
          icon: 'error',
          duration: 2000
        })
        this.setData({ loading: false })
      }
    } catch (error) {
      console.error('注册失败:', error)
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'error',
        duration: 2000
      })
      this.setData({ loading: false })
    }
  },

  // 重新生成名字推荐
  regenerateNames() {
    this.generateNameRecommendations()
    wx.showToast({
      title: '已刷新名字推荐',
      icon: 'success',
      duration: 1000
    })
  },

  // 帮助提示
  showHelp() {
    wx.showModal({
      title: '注册说明',
      content: '1. 选择或输入一个有趣的匿名名字\n2. 选择一个喜欢的卡通头像\n3. 选择你的年级（可选）\n4. 选择你的身份（学生/家长/老师）\n5. 所有信息都会匿名保护',
      showCancel: false,
      confirmText: '明白了'
    })
  }
})