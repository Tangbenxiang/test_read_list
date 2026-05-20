// cloudfunctions/garden/approveTask/index.js
// 管理员审核任务，通过后自动加健康值和积分
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

const fail = (code, message) => ({ success: false, code, message })

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()
  const _ = db.command

  // 1. 验证管理员权限
  try {
    const checkRes = await cloud.callFunction({ name: 'checkAdmin' })
    const role = checkRes.result && checkRes.result.role
    if (role !== 'admin') {
      return fail('PERMISSION_DENIED', '只有管理员才能审核任务')
    }
  } catch (err) {
    return fail('PERMISSION_DENIED', '权限验证失败')
  }

  // 2. 校验参数
  const { record_id, action, reason } = event
  if (!record_id) {
    return fail('RECORD_NOT_FOUND', '缺少记录ID')
  }
  if (action !== 'approve' && action !== 'reject') {
    return fail('INVALID_ACTION', 'action 只能是 approve 或 reject')
  }

  // 3. 查询记录
  let record
  try {
    const res = await db.collection('task_records').doc(record_id).get()
    record = res.data
  } catch (err) {
    return fail('RECORD_NOT_FOUND', '记录不存在')
  }

  if (record.status !== 'submitted') {
    return fail('INVALID_STATUS', '只能审核待审核状态的任务')
  }

  // ======== 驳回 ========
  if (action === 'reject') {
    await db.collection('task_records').doc(record_id).update({
      data: {
        status: 'rejected',
        reject_reason: reason || '',
        approved_by: OPENID
      }
    })
    return { success: true }
  }

  // ======== 通过 ========

  // 4. 查询任务的 health_value 和 points_reward
  let task
  try {
    const taskRes = await db.collection('garden_tasks').doc(record.task_id).get()
    task = taskRes.data
  } catch (err) {
    return fail('RECORD_NOT_FOUND', '关联的任务不存在')
  }

  const healthValue = task.health_value || 0
  const pointsReward = task.points_reward || 0

  // 5. 更新 task_records 状态为 approved
  await db.collection('task_records').doc(record_id).update({
    data: {
      status: 'approved',
      approved_at: db.serverDate(),
      approved_by: OPENID
    }
  })

  // 6. 更新 garden_config 健康值（不超过100）
  const configRes = await db.collection('garden_config').doc(GARDEN_CONFIG_ID).get()
  const currentHealth = configRes.data.health_point || 0
  const newHealth = Math.min(100, currentHealth + healthValue)

  await db.collection('garden_config').doc(GARDEN_CONFIG_ID).update({
    data: {
      health_point: newHealth,
      last_updated: db.serverDate()
    }
  })

  // 7. 更新用户积分
  if (pointsReward > 0) {
    await db.collection('users').where({ openid: record.openid }).update({
      data: { points: _.inc(pointsReward) }
    })
  }

  // 8. 同步照片到 garden_photos
  if (record.photos && record.photos.length > 0) {
    const weekNo = configRes.data.week_no || 1
    const photoPromises = record.photos.map(url =>
      db.collection('garden_photos').add({
        data: {
          image_url: url,
          uploader_openid: record.openid,
          child_name: record.child_name || '',
          week_no: weekNo,
          source: 'task',
          taken_at: db.serverDate()
        }
      })
    )
    await Promise.all(photoPromises)
  }

  // 9. 异步检查成就（不等待结果，不影响主流程）
  cloud.callFunction({
    name: 'checkAchievements',
    data: { openid: record.openid }
  }).catch(err => console.error('成就检查调用失败:', err))

  return {
    success: true,
    new_health_point: newHealth
  }
}
