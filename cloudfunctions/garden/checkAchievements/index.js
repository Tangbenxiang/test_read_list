// cloudfunctions/garden/checkAchievements/index.js
// 审核通过后检查用户是否解锁新菜园成就
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

const GARDEN_CONFIG_ID = '81704b8e6a0bffd700d3cfee1543e82c'

exports.main = async (event, context) => {
  const { openid } = event
  if (!openid) return { success: false, message: '缺少 openid' }

  const db = cloud.database()
  const _ = db.command

  try {
    // 1. 查用户已解锁的成就列表
    const userRes = await db.collection('users')
      .where({ openid })
      .field({ achievements: true })
      .get()

    if (!userRes.data || userRes.data.length === 0) {
      return { success: false, message: '用户不存在' }
    }

    const existingAchievements = userRes.data[0].achievements || []

    // 2. 查所有菜园成就定义
    const achRes = await db.collection('achievements')
      .where({ category: 'garden' })
      .get()

    const gardenAchievements = achRes.data || []
    if (gardenAchievements.length === 0) {
      return { success: true, new_achievements: [] }
    }

    // 3. 统计用户数据
    // 总完成数（approved）
    const approvedRes = await db.collection('task_records')
      .where({ openid, status: 'approved' })
      .field({ task_id: true })
      .get()
    const approvedCount = approvedRes.data ? approvedRes.data.length : 0

    // 认领数（claimed + submitted + approved，即只要认领过就算）
    const claimRes = await db.collection('task_records')
      .where({ openid, status: _.in(['claimed', 'submitted', 'approved']) })
      .field({ task_id: true })
      .get()
    const claimCount = claimRes.data ? claimRes.data.length : 0

    // 浇水相关完成数：需要关联 garden_tasks 看标题
    const approvedTaskIds = (approvedRes.data || []).map(r => r.task_id)
    let waterCount = 0
    if (approvedTaskIds.length > 0) {
      const uniqueTaskIds = [...new Set(approvedTaskIds)]
      const tasksRes = await db.collection('garden_tasks')
        .where({ _id: _.in(uniqueTaskIds) })
        .field({ title: true })
        .get()
      const waterTaskIds = new Set()
      for (const t of (tasksRes.data || [])) {
        if (t.title && t.title.indexOf('浇水') !== -1) {
          waterTaskIds.add(t._id)
        }
      }
      waterCount = approvedTaskIds.filter(id => waterTaskIds.has(id)).length
    }

    // 全勤检查：本周必选任务是否全部 approved
    let fullWeek = 0
    try {
      const configRes = await db.collection('garden_config').doc(GARDEN_CONFIG_ID).get()
      const weekNo = configRes.data.week_no || 1

      // 查本周必选任务
      const requiredRes = await db.collection('garden_tasks')
        .where({ week_no: weekNo, type: 'required', status: 'open' })
        .field({ _id: true })
        .get()
      const requiredTasks = requiredRes.data || []

      if (requiredTasks.length > 0) {
        const requiredIds = requiredTasks.map(t => t._id)
        // 查该用户对这些必选任务的 approved 记录
        const weekApprovedRes = await db.collection('task_records')
          .where({
            openid,
            task_id: _.in(requiredIds),
            status: 'approved'
          })
          .field({ task_id: true })
          .get()
        const approvedTaskSet = new Set((weekApprovedRes.data || []).map(r => r.task_id))
        if (requiredIds.every(id => approvedTaskSet.has(id))) {
          fullWeek = 1
        }
      }
    } catch (err) {
      // 忽略，不影响整体
    }

    // 4. 逐条检查成就是否达标且未解锁
    const stats = { claim_count: claimCount, approved_count: approvedCount, water_count: waterCount, full_week: fullWeek }
    const newAchievements = []

    for (const ach of gardenAchievements) {
      if (existingAchievements.includes(ach.id)) continue

      const required = ach.condition_value || 0
      const actual = stats[ach.condition_type] || 0
      if (actual >= required) {
        newAchievements.push(ach.id)
      }
    }

    // 5. 有新成就则更新用户
    if (newAchievements.length > 0) {
      await db.collection('users').where({ openid }).update({
        data: { achievements: _.push(newAchievements) }
      })
    }

    return { success: true, new_achievements: newAchievements }
  } catch (error) {
    console.error('检查成就失败:', error)
    return { success: false, message: error.message }
  }
}