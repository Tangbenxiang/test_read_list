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
      // books集合索引
      { collection: 'books', field: 'title', type: 'text' }, // 全文搜索索引
      { collection: 'books', field: 'author' },
      { collection: 'books', field: 'type' },
      { collection: 'books', field: 'gradeLevel' },
      { collection: 'books', field: 'purchased' },
      { collection: 'books', field: 'read' },
      { collection: 'books', field: 'intensiveRead' },
      { collection: 'books', field: 'serial' },

      // users集合索引
      { collection: 'users', field: 'openid', unique: true },
      { collection: 'users', field: 'anonymousName', unique: true },
      { collection: 'users', field: 'role' },
      { collection: 'users', field: 'grade' },
      { collection: 'users', field: 'points' },

      // weekly_challenges集合索引
      { collection: 'weekly_challenges', field: 'status' },
      { collection: 'weekly_challenges', field: 'type' },
      { collection: 'weekly_challenges', field: 'bookId' },
      { collection: 'weekly_challenges', field: 'startTime' },
      { collection: 'weekly_challenges', field: 'endTime' },

      // challenge_responses集合索引
      { collection: 'challenge_responses', field: 'challengeId' },
      { collection: 'challenge_responses', field: 'userId' },
      { collection: 'challenge_responses', field: 'bookId' },
      { collection: 'challenge_responses', field: 'submittedAt' },

      // reading_shares集合索引
      { collection: 'reading_shares', field: 'userId' },
      { collection: 'reading_shares', field: 'bookId' },
      { collection: 'reading_shares', field: 'type' },
      { collection: 'reading_shares', field: 'createTime' },

      // family_connections集合索引
      { collection: 'family_connections', field: 'parentId' },
      { collection: 'family_connections', field: 'studentId' },
      { collection: 'family_connections', field: 'connectionCode', unique: true },
      { collection: 'family_connections', field: 'status' },

      // achievements集合索引
      { collection: 'achievements', field: 'category' },
      { collection: 'achievements', field: 'rarity' },

      // user_planned_books集合索引
      { collection: 'user_planned_books', field: 'userId' },
      { collection: 'user_planned_books', field: 'bookId' },
      { collection: 'user_planned_books', field: 'status' },
      { collection: 'user_planned_books', field: 'addedTime' }
    ]

    // 数据库结构说明 - 所有集合
    const collections = [
      {
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
      },
      {
        name: 'admins',
        fields: [
          { name: 'openid', type: 'string', description: '微信用户openid', required: true },
          { name: 'nickname', type: 'string', description: '昵称' },
          { name: 'role', type: 'string', description: '角色', required: true, enum: ['admin'] },
          { name: 'createTime', type: 'date', description: '创建时间', default: 'serverDate' }
        ]
      },
      {
        name: 'feedback',
        fields: [
          { name: 'content', type: 'string', description: '反馈内容', required: true },
          { name: 'userInfo', type: 'object', description: '用户信息' },
          { name: 'contact', type: 'string', description: '联系方式' },
          { name: 'status', type: 'string', description: '状态', enum: ['pending', 'reviewed', 'resolved'] },
          { name: 'createTime', type: 'date', description: '创建时间', default: 'serverDate' }
        ]
      },
      {
        name: 'users',
        fields: [
          { name: 'openid', type: 'string', description: '微信openid', required: true },
          { name: 'anonymousName', type: 'string', description: '匿名昵称', required: true },
          { name: 'avatarIndex', type: 'number', description: '预设头像编号(0-29)', required: true },
          { name: 'role', type: 'string', description: '用户角色', required: true, enum: ['student', 'parent', 'teacher', 'admin'] },
          { name: 'grade', type: 'string', description: '学生年级（仅student角色）', enum: ['一至二年级', '三至四年级', '五至六年级'] },
          { name: 'points', type: 'number', description: '荣誉积分', default: 0 },
          { name: 'achievements', type: 'array', description: '已解锁成就ID列表' },
          { name: 'readingStats', type: 'object', description: '阅读统计' },
          { name: 'settings', type: 'object', description: '用户设置' },
          { name: 'createTime', type: 'date', description: '创建时间', default: 'serverDate' },
          { name: 'lastLoginTime', type: 'date', description: '最后登录时间', default: 'serverDate' }
        ]
      },
      {
        name: 'weekly_challenges',
        fields: [
          { name: 'type', type: 'string', description: '挑战类型', required: true, enum: ['weekly', 'special'] },
          { name: 'bookId', type: 'string', description: '关联书籍ID', required: true },
          { name: 'title', type: 'string', description: '挑战标题', required: true },
          { name: 'description', type: 'string', description: '挑战描述' },
          { name: 'questions', type: 'array', description: '问题列表', required: true },
          { name: 'weekNumber', type: 'number', description: '第几周' },
          { name: 'year', type: 'number', description: '年份' },
          { name: 'startTime', type: 'date', description: '挑战开始时间', required: true },
          { name: 'endTime', type: 'date', description: '挑战结束时间', required: true },
          { name: 'status', type: 'string', description: '状态', enum: ['upcoming', 'active', 'ended'] },
          { name: 'difficulty', type: 'string', description: '难度级别', enum: ['easy', 'medium', 'hard'] },
          { name: 'createdBy', type: 'string', description: '创建者openid', required: true },
          { name: 'tags', type: 'array', description: '挑战标签' },
          { name: 'createTime', type: 'date', description: '创建时间', default: 'serverDate' }
        ]
      },
      {
        name: 'challenge_responses',
        fields: [
          { name: 'challengeId', type: 'string', description: '挑战ID', required: true },
          { name: 'userId', type: 'string', description: '用户ID', required: true },
          { name: 'bookId', type: 'string', description: '书籍ID', required: true },
          { name: 'answers', type: 'array', description: '回答列表', required: true },
          { name: 'totalScore', type: 'number', description: '总分（百分比）' },
          { name: 'timeSpent', type: 'number', description: '答题用时（秒）' },
          { name: 'submittedAt', type: 'date', description: '提交时间', default: 'serverDate' },
          { name: 'feedback', type: 'string', description: '系统反馈' },
          { name: 'createTime', type: 'date', description: '创建时间', default: 'serverDate' }
        ]
      },
      {
        name: 'reading_shares',
        fields: [
          { name: 'userId', type: 'string', description: '分享者ID', required: true },
          { name: 'bookId', type: 'string', description: '关联书籍ID', required: true },
          { name: 'content', type: 'string', description: '分享内容', required: true },
          { name: 'type', type: 'string', description: '分享类型', required: true, enum: ['thought', 'recommendation', 'question'] },
          { name: 'visibility', type: 'string', description: '可见范围', enum: ['public', 'classmates', 'followers'] },
          { name: 'likes', type: 'array', description: '点赞用户列表' },
          { name: 'comments', type: 'array', description: '评论列表' },
          { name: 'tags', type: 'array', description: '标签' },
          { name: 'createTime', type: 'date', description: '创建时间', default: 'serverDate' }
        ]
      },
      {
        name: 'family_connections',
        fields: [
          { name: 'parentId', type: 'string', description: '家长用户ID', required: true },
          { name: 'studentId', type: 'string', description: '学生用户ID', required: true },
          { name: 'connectionType', type: 'string', description: '关联类型', required: true, enum: ['parent_child', 'teacher_student'] },
          { name: 'connectionCode', type: 'string', description: '6位关联代码', required: true },
          { name: 'status', type: 'string', description: '状态', enum: ['pending', 'active', 'inactive'] },
          { name: 'permissions', type: 'object', description: '权限设置' },
          { name: 'createTime', type: 'date', description: '创建时间', default: 'serverDate' },
          { name: 'connectedAt', type: 'date', description: '关联时间' }
        ]
      },
      {
        name: 'achievements',
        fields: [
          { name: 'name', type: 'string', description: '成就名称', required: true },
          { name: 'description', type: 'string', description: '成就描述', required: true },
          { name: 'icon', type: 'string', description: '成就图标文件名' },
          { name: 'pointsReward', type: 'number', description: '积分奖励', required: true },
          { name: 'condition', type: 'object', description: '解锁条件', required: true },
          { name: 'rarity', type: 'string', description: '稀有度', enum: ['common', 'rare', 'epic', 'legendary'] },
          { name: 'category', type: 'string', description: '成就类别', enum: ['challenge', 'social', 'reading'] },
          { name: 'createTime', type: 'date', description: '创建时间', default: 'serverDate' }
        ]
      },
      {
        name: 'user_planned_books',
        fields: [
          { name: 'userId', type: 'string', description: '用户ID', required: true },
          { name: 'bookId', type: 'string', description: '书籍ID', required: true },
          { name: 'status', type: 'string', description: '阅读状态', required: true, enum: ['planned', 'reading', 'completed'] },
          { name: 'addedTime', type: 'date', description: '添加时间', default: 'serverDate' },
          { name: 'updatedTime', type: 'date', description: '更新时间', default: 'serverDate' },
          { name: 'notes', type: 'string', description: '个人笔记' }
        ]
      }
    ]

    // 检查所有集合是否存在并获取状态
    const collectionStatuses = []

    for (const collection of collections) {
      try {
        const testResult = await db.collection(collection.name).limit(1).get()
        collectionStatuses.push({
          name: collection.name,
          exists: true,
          count: testResult.data.length,
          message: '集合已存在'
        })
      } catch (error) {
        // 集合可能不存在或为空
        collectionStatuses.push({
          name: collection.name,
          exists: false,
          count: 0,
          message: '集合可能需要创建'
        })
      }
    }

    return {
      success: true,
      message: '数据库初始化检查完成',
      collections: collectionStatuses,
      collectionStructures: collections,
      indexSuggestions: indexSuggestions,
      instructions: '请在云开发控制台创建缺失的集合，并添加上述字段和索引'
    }
  } catch (error) {
    console.error('初始化数据库检查失败:', error)
    return {
      success: false,
      error: error.message,
      instructions: '请确保已开通云开发服务，并在云控制台创建所需的集合'
    }
  }
}