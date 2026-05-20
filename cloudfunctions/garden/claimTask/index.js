// cloudfunctions/garden/claimTask/index.js
// 家长认领任务，在 task_records 创建一条记录
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

const fail = (code, message) => ({ success: false, code, message })

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()
  const _ = db.command

  // 1. 校验 task_id
  const { task_id } = event
  if (!task_id) {
    return fail('TASK_NOT_FOUND', '缺少任务ID')
  }

  // 2. 查询当前用户信息，获取 child_name 和 user_id
  let userRecord
  try {
    const userRes = await db.collection('users')
      .where({ openid: OPENID })
      .limit(1)
      .get()

    if (userRes.data.length === 0) {
      return fail('USER_NOT_FOUND', '用户未注册，请先完成注册')
    }
    userRecord = userRes.data[0]
  } catch (err) {
    console.error('查询用户失败:', err)
    return fail('USER_NOT_FOUND', '查询用户信息失败')
  }

  // 3. 查询任务，校验存在性和状态
  let task
  try {
    const taskRes = await db.collection('garden_tasks').doc(task_id).get()
    task = taskRes.data
  } catch (err) {
    return fail('TASK_NOT_FOUND', '任务不存在')
  }

  if (task.status !== 'open') {
    return fail('TASK_CLOSED', '任务已关闭，无法认领')
  }

  if (task.deadline && new Date(task.deadline) < new Date()) {
    return fail('TASK_EXPIRED', '任务已过截止时间')
  }

  // 4. 校验用户是否已认领过同一任务
  const existingClaim = await db.collection('task_records')
    .where({
      task_id: task_id,
      openid: OPENID,
      status: _.in(['claimed', 'submitted', 'approved'])
    })
    .limit(1)
    .get()

  if (existingClaim.data.length > 0) {
    return fail('ALREADY_CLAIMED', '你已经认领过这个任务了')
  }

  // 5. 检查认领上限（max_claim > 0 时生效）
  if (task.max_claim && task.max_claim > 0) {
    const claimCountRes = await db.collection('task_records')
      .where({
        task_id: task_id,
        status: _.in(['claimed', 'submitted', 'approved'])
      })
      .count()

    if (claimCountRes.total >= task.max_claim) {
      return fail('CLAIM_LIMIT_REACHED', '认领名额已满')
    }
  }

  // 6. 插入认领记录
  const newRecord = {
    task_id: task_id,
    task_title: task.title || '',
    user_id: userRecord._id,
    openid: OPENID,
    child_name: userRecord.child_name || '',
    claimed_at: db.serverDate(),
    photos: [],
    note: '',
    status: 'claimed'
  }

  const addRes = await db.collection('task_records').add({ data: newRecord })

  return {
    success: true,
    record_id: addRes._id
  }
}
