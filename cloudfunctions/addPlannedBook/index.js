// cloudfunctions/addPlannedBook/index.js
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

  const {
    title,
    type,
    author,
    description = '',
    gradeLevel,
    purchased = false,
    read = false,
    intensiveRead = false,
    cover = '',
    status = 'planned', // planned, reading, completed
    testMode = false,
    testUserId = null
  } = event

  try {
    // 1. 验证用户是否登录（支持测试模式）
    let userId = OPENID

    if (!userId && testMode) {
      // 测试模式：使用测试用户ID或生成一个
      userId = testUserId || 'test_openid_' + Date.now()
      console.log('测试模式：使用测试用户ID', userId)
    }

    if (!userId) {
      return {
        success: false,
        error: '未登录',
        message: '请先登录'
      }
    }

    // 2. 验证必要字段
    if (!title || !type || !author || !gradeLevel) {
      return {
        success: false,
        error: '参数不完整',
        message: '书名、类型、作者和年级为必填项'
      }
    }

    // 3. 验证年级字段格式
    const validGradeLevels = ['一至二年级', '三至四年级', '五至六年级']
    if (!validGradeLevels.includes(gradeLevel)) {
      return {
        success: false,
        error: '参数错误',
        message: '年级必须为：一至二年级、三至四年级、五至六年级'
      }
    }

    // 4. 检查书籍是否已存在（通过标题和作者判断）
    const existingBook = await db.collection('books')
      .where({
        title: title,
        author: author
      })
      .limit(1)
      .get()

    let bookId
    let bookSerial

    if (existingBook.data.length > 0) {
      // 书籍已存在，使用现有书籍ID
      bookId = existingBook.data[0]._id
      bookSerial = existingBook.data[0].serial
    } else {
      // 书籍不存在，创建新书籍
      // 获取最大序号
      const maxSerialResult = await db.collection('books')
        .orderBy('serial', 'desc')
        .limit(1)
        .get()

      const maxSerial = maxSerialResult.data.length > 0 ? maxSerialResult.data[0].serial : 0
      const newSerial = maxSerial + 1

      // 创建新书籍
      const newBook = {
        serial: newSerial,
        title,
        type,
        author,
        description,
        gradeLevel,
        purchased,
        read,
        intensiveRead,
        cover,
        addedBy: userId,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }

      const addResult = await db.collection('books').add({
        data: newBook
      })

      if (!addResult._id) {
        throw new Error('添加书籍失败')
      }

      bookId = addResult._id
      bookSerial = newSerial
    }

    // 5. 检查是否已添加到计划阅读列表
    let existingPlanned = { data: [] }
    try {
      existingPlanned = await db.collection('user_planned_books')
        .where({
          userId: userId,
          bookId: bookId
        })
        .limit(1)
        .get()
    } catch (queryError) {
      // 如果集合不存在，继续执行（视为没有重复记录）
      if (!queryError.message.includes('DATABASE_COLLECTION_NOT_EXIST') &&
          !queryError.message.includes('collection.get:fail')) {
        throw queryError // 重新抛出其他错误
      }
      console.log('user_planned_books集合不存在，跳过重复检查')
    }

    if (existingPlanned.data.length > 0) {
      return {
        success: false,
        error: '已存在',
        message: '该书已添加至计划阅读列表'
      }
    }

    // 6. 添加到用户计划阅读列表
    const plannedBook = {
      userId: userId,
      bookId: bookId,
      status: status, // planned, reading, completed
      addedTime: db.serverDate(),
      updatedTime: db.serverDate(),
      notes: ''
    }

    const addPlannedResult = await db.collection('user_planned_books').add({
      data: plannedBook
    })

    if (addPlannedResult._id) {
      return {
        success: true,
        plannedBookId: addPlannedResult._id,
        bookId: bookId,
        serial: bookSerial,
        message: '成功添加到计划阅读列表'
      }
    } else {
      throw new Error('添加到计划阅读列表失败')
    }
  } catch (error) {
    console.error('添加计划阅读书籍失败:', error)
    return {
      success: false,
      error: error.message,
      message: '添加失败，请稍后重试'
    }
  }
}