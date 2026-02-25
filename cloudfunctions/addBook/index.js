// cloudfunctions/addBook/index.js
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
    cover = ''
  } = event

  try {
    // 1. 检查管理员权限
    const adminCheck = await db.collection('admins')
      .where({
        openid: OPENID,
        role: 'admin'
      })
      .get()

    if (adminCheck.data.length === 0) {
      return {
        success: false,
        error: '权限不足',
        message: '只有管理员可以添加书籍'
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

    // 4. 获取最大序号
    const maxSerialResult = await db.collection('books')
      .orderBy('serial', 'desc')
      .limit(1)
      .get()

    const maxSerial = maxSerialResult.data.length > 0 ? maxSerialResult.data[0].serial : 0
    const newSerial = maxSerial + 1

    // 5. 创建新书籍
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
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }

    const addResult = await db.collection('books').add({
      data: newBook
    })

    if (addResult._id) {
      return {
        success: true,
        bookId: addResult._id,
        serial: newSerial,
        bookInfo: newBook,
        message: '书籍添加成功'
      }
    } else {
      throw new Error('添加书籍失败')
    }
  } catch (error) {
    console.error('添加书籍失败:', error)
    return {
      success: false,
      error: error.message,
      message: '添加书籍失败，请稍后重试'
    }
  }
}