// cloudfunctions/initDatabase/index.js
const cloud = require('wx-server-sdk')

// 云函数初始化 - 使用最简单的初始化方式
// 在云函数中，可以不带参数初始化，会自动使用当前环境
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
  const db = cloud.database()

  try {
    // 检查books集合是否存在（实际上云开发会自动创建集合）
    // 这里我们只是返回集合信息和索引建议

    // 建议的索引配置
    const indexSuggestions = [
      { field: 'title', type: 'text' }, // 全文搜索索引
      { field: 'author' },
      { field: 'type' },
      { field: 'gradeLevel' },
      { field: 'purchased' },
      { field: 'read' },
      { field: 'intensiveRead' },
      { field: 'serial' }
    ]

    // 数据库结构说明
    const collectionStructure = {
      name: 'books',
      fields: [
        { name: 'serial', type: 'number', description: '序号' },
        { name: 'title', type: 'string', description: '书名', required: true },
        { name: 'type', type: 'string', description: '书籍类型', required: true },
        { name: 'author', type: 'string', description: '作者', required: true },
        { name: 'description', type: 'string', description: '简介' },
        { name: 'gradeLevel', type: 'string', description: '适合年级', enum: ['一至二年级', '三至四年级', '五至六年级'] },
        { name: 'purchased', type: 'boolean', description: '是否购买', default: false },
        { name: 'read', type: 'boolean', description: '是否阅读', default: false },
        { name: 'intensiveRead', type: 'boolean', description: '是否精读', default: false },
        { name: 'cover', type: 'string', description: '封面图片URL（可选）' },
        { name: 'createTime', type: 'date', description: '创建时间', default: 'serverDate' }
      ]
    }

    // 检查集合是否存在（尝试获取一条记录）
    try {
      const testResult = await db.collection('books').limit(1).get()
      return {
        success: true,
        message: 'books集合已存在',
        count: testResult.data.length,
        structure: collectionStructure,
        indexSuggestions: indexSuggestions,
        instructions: '请在云开发控制台创建上述索引以提高查询性能'
      }
    } catch (error) {
      // 集合可能不存在或为空
      return {
        success: true,
        message: 'books集合可能需要创建',
        structure: collectionStructure,
        indexSuggestions: indexSuggestions,
        instructions: '请在云开发控制台创建books集合，并添加上述字段和索引'
      }
    }
  } catch (error) {
    console.error('初始化数据库检查失败:', error)
    return {
      success: false,
      error: error.message,
      instructions: '请确保已开通云开发服务，并在云控制台创建books集合'
    }
  }
}