// pages/addbook/addbook.js
Page({
  data: {
    // 表单数据
    formData: {
      title: '',
      type: '',
      author: '',
      description: '',
      gradeLevel: '一至二年级',
      purchased: false,
      read: false,
      intensiveRead: false,
      cover: ''
    },
    // 书籍类型选项
    typeOptions: [
      '童话', '科普', '古典文学', '儿童文学小说', '校园生活', '绘本',
      '奇幻童话/敦煌文化启蒙', '侦探小说（青少版）', '奇幻小说',
      '儿童散文/成长观察', '儿童文学', '其他'
    ],
    // 自定义类型相关
    customTypeVisible: false,
    customTypeValue: '',
    // 年级选项
    gradeOptions: ['一至二年级', '三至四年级', '五至六年级'],
    // 状态
    submitting: false,
    isAdmin: false,
    checkingAdmin: true,
    errorMessage: '',
    // 是否为计划阅读模式
    isPlanned: false,
    allowAdd: false
  },

  onLoad(options) {
    // 检查是否为计划阅读模式
    if (options.planned === 'true') {
      this.setData({
        isPlanned: true,
        checkingAdmin: false
      })
      wx.setNavigationBarTitle({
        title: '添加计划阅读书籍'
      })
      this.checkUserLogin()
    } else {
      this.checkAdminPermission()
    }
  },

  // 检查管理员权限
  async checkAdminPermission() {
    this.setData({ checkingAdmin: true })
    console.log('开始检查管理员权限...')

    try {
      const res = await wx.cloud.callFunction({
        name: 'checkAdmin'
      })

      console.log('checkAdmin云函数返回结果:', JSON.stringify(res.result))

      if (res.result.success && res.result.isAdmin) {
        console.log('管理员权限检查通过')
        this.setData({
          isAdmin: true,
          checkingAdmin: false
        })
      } else {
        console.log('管理员权限检查失败，success:', res.result.success, 'isAdmin:', res.result.isAdmin)
        this.setData({
          isAdmin: false,
          checkingAdmin: false,
          errorMessage: '您没有权限添加书籍'
        })
      }
    } catch (error) {
      console.error('检查管理员权限失败:', error)
      this.setData({
        isAdmin: false,
        checkingAdmin: false,
        errorMessage: '权限检查失败，请稍后重试'
      })
    }
  },

  // 检查用户登录状态（用于计划阅读模式）
  async checkUserLogin() {
    this.setData({ checkingAdmin: true })
    console.log('开始检查用户登录状态...')

    try {
      const res = await wx.cloud.callFunction({
        name: 'checkAdmin'
      })

      console.log('checkAdmin云函数返回结果:', JSON.stringify(res.result))

      // 检查云函数返回结构
      if (res.result) {
        // 简化逻辑：只要云函数调用成功（无论角色），就允许添加计划阅读书籍
        // 因为checkAdmin云函数在用户不存在时会自动创建测试用户
        let isLoggedIn = false

        if (res.result.success) {
          // success为true表示用户已注册或自动创建成功
          isLoggedIn = true
          console.log('checkAdmin返回success: true, isAdmin:', res.result.isAdmin, 'role:', res.result.role)
        } else if (res.result.isAdmin !== undefined) {
          // 兼容旧结构：有isAdmin字段也表示已登录
          isLoggedIn = true
          console.log('checkAdmin返回isAdmin字段:', res.result.isAdmin)
        }

        if (!isLoggedIn) {
          // 未登录用户，跳转到注册页面
          console.log('用户未登录或登录失败')
          this.setData({
            allowAdd: false,
            checkingAdmin: false,
            errorMessage: '请先注册登录'
          })

          wx.showModal({
            title: '提示',
            content: '添加计划阅读书籍需要先注册登录，是否立即前往注册？',
            confirmText: '前往注册',
            cancelText: '取消',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.redirectTo({
                  url: '/pages/register/register'
                })
              } else {
                // 用户取消，返回上一页
                setTimeout(() => {
                  wx.navigateBack()
                }, 1000)
              }
            }
          })
        } else {
          // 已登录用户，允许添加
          this.setData({
            allowAdd: true,
            checkingAdmin: false
          })
          console.log('用户已登录，允许添加计划阅读书籍')
        }
      } else {
        // 云函数返回异常
        this.setData({
          allowAdd: false,
          checkingAdmin: false,
          errorMessage: '登录状态检查失败'
        })
        wx.showToast({
          title: '服务异常，请重试',
          icon: 'none',
          duration: 2000
        })
      }
    } catch (error) {
      console.error('检查用户登录状态失败:', error)
      this.setData({
        allowAdd: false,
        checkingAdmin: false,
        errorMessage: '登录检查失败，请稍后重试'
      })
      wx.showToast({
        title: '网络错误，请检查连接',
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 表单输入处理
  onInputChange(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value

    this.setData({
      [`formData.${field}`]: value
    })
  },

  // 选择器变化处理
  onPickerChange(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value

    if (field === 'type') {
      const selectedType = this.data.typeOptions[value]
      const isOtherType = selectedType === '其他'

      this.setData({
        [`formData.${field}`]: selectedType,
        customTypeVisible: isOtherType,
        customTypeValue: isOtherType ? this.data.customTypeValue : ''
      })
    } else if (field === 'gradeLevel') {
      this.setData({
        [`formData.${field}`]: this.data.gradeOptions[value]
      })
    }
  },

  // 自定义类型输入处理
  onCustomTypeInput(e) {
    const value = e.detail.value
    this.setData({
      customTypeValue: value
    })
  },

  // 开关切换处理
  onSwitchChange(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value

    this.setData({
      [`formData.${field}`]: value
    })
  },

  // 提交表单
  async submitForm() {
    const { formData, submitting, isAdmin, isPlanned, allowAdd } = this.data
    console.log('提交表单，权限状态 - isPlanned:', isPlanned, 'isAdmin:', isAdmin, 'allowAdd:', allowAdd)

    // 验证权限
    if (isPlanned) {
      // 计划阅读模式，只需要用户登录即可
      if (!allowAdd) {
        console.log('计划阅读模式权限检查失败: allowAdd为false')
        wx.showToast({
          title: '添加失败，请检查登录状态',
          icon: 'error',
          duration: 2000
        })
        return
      } else {
        console.log('计划阅读模式权限检查通过')
      }
    } else {
      // 普通添加模式，需要管理员权限
      if (!isAdmin) {
        console.log('普通添加模式权限检查失败: isAdmin为false')
        wx.showToast({
          title: '没有操作权限',
          icon: 'error',
          duration: 2000
        })
        return
      } else {
        console.log('普通添加模式权限检查通过')
      }
    }

    if (submitting) return

    // 验证必要字段
    if (!formData.title.trim()) {
      wx.showToast({
        title: '请输入书名',
        icon: 'none',
        duration: 2000
      })
      return
    }

    // 处理书籍类型：如果选择"其他"则使用自定义类型
    let finalType = formData.type.trim()
    if (finalType === '其他') {
      if (!this.data.customTypeValue.trim()) {
        wx.showToast({
          title: '请输入自定义书籍类型',
          icon: 'none',
          duration: 2000
        })
        return
      }
      finalType = this.data.customTypeValue.trim()
    } else if (!finalType) {
      wx.showToast({
        title: '请选择书籍类型',
        icon: 'none',
        duration: 2000
      })
      return
    }

    if (!formData.author.trim()) {
      wx.showToast({
        title: '请输入作者',
        icon: 'none',
        duration: 2000
      })
      return
    }

    this.setData({ submitting: true })

    wx.showLoading({
      title: '添加中...',
      mask: true
    })

    try {
      let res
      if (isPlanned) {
        // 调用计划阅读添加云函数
        console.log('调用addPlannedBook云函数，表单数据:', formData)
        res = await wx.cloud.callFunction({
          name: 'addPlannedBook',
          data: {
            ...formData,
            type: finalType
            // 移除testMode参数，使用实际用户OPENID
          }
        })
      } else {
        // 调用普通添加云函数
        res = await wx.cloud.callFunction({
          name: 'addBook',
          data: {
            ...formData,
            type: finalType
          }
        })
      }

      wx.hideLoading()

      if (res.result.success) {
        wx.showToast({
          title: isPlanned ? '已添加到计划阅读列表' : '添加成功',
          icon: 'success',
          duration: 2000
        })

        // 清空表单
        this.setData({
          formData: {
            title: '',
            type: '',
            author: '',
            description: '',
            gradeLevel: '一至二年级',
            purchased: false,
            read: false,
            intensiveRead: false,
            cover: ''
          },
          customTypeVisible: false,
          customTypeValue: ''
        })

        // 延迟返回
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        // 显示云函数返回的具体错误信息
        let errorMsg = '添加失败'
        if (res.result.message) {
          errorMsg = res.result.message
        } else if (res.result.error) {
          errorMsg = res.result.error
        }
        wx.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 2000
        })
      }
    } catch (error) {
      console.error('添加书籍失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '网络错误，请检查连接后重试',
        icon: 'error',
        duration: 2000
      })
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 页面分享
  onShareAppMessage() {
    return {
      title: '添加新书籍 - 儿童阅读记录',
      path: '/pages/addbook/addbook'
    }
  }
})