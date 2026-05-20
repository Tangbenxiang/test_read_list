// cloudfunctions/garden/getPendingRecords/index.js
// 管理员获取所有待审核任务记录，关联补充任务详情
const cloud = require('wx-server-sdk')

try {
  cloud.init({})
} catch (error) {
  console.error('云函数初始化失败:', error)
  try {
    cloud.init({ env: 'cloudbase-4gnknimqbe0440c9' })
  } catch (fixedError) {
    console.error('固定环境初始化也失败:', fixedError)
  }
}

exports.main = async (event, context) => {
  const db = cloud.database()
  const _ = db.command

  // 1. 验证管理员权限
  try {
    const checkRes = await cloud.callFunction({ name: 'checkAdmin' })
    const role = checkRes.result && checkRes.result.role
    if (role !== 'admin') {
      return { success: false, code: 'PERMISSION_DENIED', message: '只有管理员才能查看待审核记录' }
    }
  } catch (err) {
    return { success: false, code: 'PERMISSION_DENIED', message: '权限验证失败' }
  }

  try {
    // 2. 查询所有待审核记录，按提交时间正序（先提交先审核）
    const recordsRes = await db.collection('task_records')
      .where({ status: 'submitted' })
      .orderBy('submitted_at', 'asc')
      .get()

    const records = recordsRes.data || []

    if (records.length === 0) {
      return { success: true, data: { records: [], total: 0 } }
    }

    // 3. 提取 task_id 列表（去重）
    const taskIds = [...new Set(records.map(r => r.task_id))]

    // 4. 批量查询关联的 garden_tasks
    const tasksRes = await db.collection('garden_tasks')
      .where({ _id: _.in(taskIds) })
      .get()

    const taskMap = {}
    for (const t of (tasksRes.data || [])) {
      taskMap[t._id] = t
    }

    // 5. 合并字段到每条记录
    const enrichedRecords = records.map(r => {
      const task = taskMap[r.task_id] || {}
      return {
        ...r,
        task_title: r.task_title || task.title || '任务',
        task_icon: task.icon || '📋'
      }
    })

    return {
      success: true,
      data: { records: enrichedRecords, total: enrichedRecords.length }
    }
  } catch (error) {
    console.error('获取待审核记录失败:', error)
    return { success: false, code: 'SERVER_ERROR', message: error.message }
  }
}
