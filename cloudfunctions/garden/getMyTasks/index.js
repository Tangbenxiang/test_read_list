// cloudfunctions/garden/getMyTasks/index.js
// 获取当前用户的所有任务记录，关联补充任务详情字段
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
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()
  const _ = db.command

  try {
    // 1. 查询当前用户的所有有效任务记录
    const recordsRes = await db.collection('task_records')
      .where({
        openid: OPENID,
        status: _.in(['claimed', 'submitted', 'approved', 'rejected'])
      })
      .orderBy('claimed_at', 'desc')
      .get()

    const records = recordsRes.data || []

    if (records.length === 0) {
      return { success: true, data: [] }
    }

    // 2. 提取 task_id 列表（去重）
    const taskIds = [...new Set(records.map(r => r.task_id))]

    // 3. 批量查询关联的 garden_tasks（初期数量少，单次 in 查询够用）
    const tasksRes = await db.collection('garden_tasks')
      .where({ _id: _.in(taskIds) })
      .get()

    // 建立 task_id → task 字段映射
    const taskMap = {}
    for (const t of (tasksRes.data || [])) {
      taskMap[t._id] = t
    }

    // 4. 合并字段到每条记录
    const enrichedRecords = records.map(r => {
      const task = taskMap[r.task_id] || {}
      return {
        ...r,
        task_icon: task.icon || r.task_icon || '📋',
        task_deadline: task.deadline || r.task_deadline || '',
        points_reward: task.points_reward || 0,
        health_value: task.health_value || 0,
        estimated_time: task.estimated_time || '',
        // 保留 claimTask 时冗余存储的 task_title 作为兜底
        task_title: r.task_title || task.title || '任务'
      }
    })

    return {
      success: true,
      data: enrichedRecords
    }
  } catch (error) {
    console.error('获取我的任务失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
