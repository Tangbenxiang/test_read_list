// cloudfunctions/garden/getTasks/index.js
// 获取任务列表，任务大厅页面调用
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

// garden_config 固定 _id
const GARDEN_CONFIG_ID = '81704b8e6a0bffd700d3cfee1543e82c'

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()
  const _ = db.command

  try {
    // 1. 确定 week_no：优先用传入值，否则从 garden_config 读取
    let weekNo = event.week_no
    if (weekNo === undefined || weekNo === null) {
      const configRes = await db.collection('garden_config').doc(GARDEN_CONFIG_ID).get()
      weekNo = configRes.data.week_no || 1
    }

    // 2. 查询本周开放任务
    const tasksRes = await db.collection('garden_tasks')
      .where({ week_no: weekNo, status: 'open' })
      .get()

    const tasks = tasksRes.data || []

    if (tasks.length === 0) {
      return {
        success: true,
        data: { week_no: weekNo, tasks: [], user_claimed_ids: [] }
      }
    }

    const taskIds = tasks.map(t => t._id)

    // 3. 查询当前用户的认领记录
    const myClaimsRes = await db.collection('task_records')
      .where({
        task_id: _.in(taskIds),
        openid: OPENID,
        status: _.in(['claimed', 'submitted', 'approved'])
      })
      .field({ task_id: true })
      .get()

    const userClaimedIds = myClaimsRes.data.map(r => r.task_id)

    // 4. 查询每个任务的认领数量（只统计有效状态）
    const allClaimsRes = await db.collection('task_records')
      .where({
        task_id: _.in(taskIds),
        status: _.in(['claimed', 'submitted', 'approved'])
      })
      .field({ task_id: true })
      .get()

    // 按 task_id 统计认领数
    const claimCountMap = {}
    for (const r of allClaimsRes.data) {
      claimCountMap[r.task_id] = (claimCountMap[r.task_id] || 0) + 1
    }

    // 5. 组装结果，required 排在前面
    const resultTasks = tasks.map(t => ({
      ...t,
      claim_count: claimCountMap[t._id] || 0,
      user_claimed: userClaimedIds.includes(t._id)
    }))

    // 排序：required 在前，optional 在后
    resultTasks.sort((a, b) => {
      if (a.type === 'required' && b.type !== 'required') return -1
      if (a.type !== 'required' && b.type === 'required') return 1
      return 0
    })

    return {
      success: true,
      data: {
        week_no: weekNo,
        tasks: resultTasks,
        user_claimed_ids: userClaimedIds
      }
    }
  } catch (error) {
    console.error('获取任务列表失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
