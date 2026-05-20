// cloudfunctions/garden/getStatus/index.js
// 获取菜园当前状态，供主页调用
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

// garden_config 固定 _id，只有一条记录
const GARDEN_CONFIG_ID = '81704b8e6a0bffd700d3cfee1543e82c'

// 根据 health_point 计算健康状态档位
function getHealthStatus(hp) {
  if (hp >= 90) return { name: '欣欣向荣', emoji: '🌟', color: '#2E7D32', desc: '菜园超级开心，蔬菜们茁壮成长！' }
  if (hp >= 70) return { name: '生长良好', emoji: '🌿', color: '#43A047', desc: '菜园状态不错，继续加油！' }
  if (hp >= 50) return { name: '有点疲惫', emoji: '🥱', color: '#9CCC65', desc: '菜园有点渴了，快来帮帮它！' }
  if (hp >= 30) return { name: '需要关爱', emoji: '😟', color: '#FF7043', desc: '菜园在哭泣，小农夫们快出动！' }
  return { name: '紧急求救', emoji: '🆘', color: '#E53935', desc: '菜园快撑不住了！全班紧急任务！' }
}

exports.main = async (event, context) => {
  const db = cloud.database()

  try {
    // 1. 读取菜园配置（固定 _id）
    const configRes = await db.collection('garden_config').doc(GARDEN_CONFIG_ID).get()
    const config = configRes.data

    const hp = config.health_point || 0
    const healthStatus = getHealthStatus(hp)

    // 2. 查询本周开放任务
    const currentWeek = config.week_no || 1
    const tasksRes = await db.collection('garden_tasks')
      .where({ week_no: currentWeek, status: 'open' })
      .get()

    const tasks = tasksRes.data || []
    const total = tasks.length
    const requiredTasks = tasks.filter(t => t.type === 'required')
    const required = requiredTasks.length
    const requiredTaskIds = requiredTasks.map(t => t._id)

    // 3. 查询本周已认领的记录，统计哪些必选任务已被认领
    let unclaimedRequired = required
    let hasUrgent = hp < 50

    if (requiredTaskIds.length > 0) {
      // 注意：云数据库 where 中 _id 数组需用 _.in
      const _ = db.command
      const claimedRes = await db.collection('task_records')
        .where({
          task_id: _.in(requiredTaskIds),
          status: _.in(['claimed', 'submitted', 'approved'])
        })
        .field({ task_id: true })
        .get()

      // 已被认领的 task_id 集合（去重）
      const claimedTaskIds = new Set(claimedRes.data.map(r => r.task_id))
      unclaimedRequired = requiredTaskIds.filter(id => !claimedTaskIds.has(id)).length
    }

    return {
      success: true,
      data: {
        health_point: hp,
        current_stage: config.current_stage || '',
        stage_desc: config.stage_desc || '',
        stage_image: config.stage_image || '',
        week_no: currentWeek,
        health_status: healthStatus.name,
        health_color: healthStatus.color,
        health_desc: healthStatus.desc,
        health_emoji: healthStatus.emoji,
        task_summary: {
          total,
          required,
          unclaimed_required: unclaimedRequired,
          has_urgent: hasUrgent
        }
      }
    }
  } catch (error) {
    console.error('获取菜园状态失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
