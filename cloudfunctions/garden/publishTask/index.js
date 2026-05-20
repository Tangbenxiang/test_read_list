// cloudfunctions/garden/publishTask/index.js
// 管理员发布新任务或编辑已有任务
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

// 编辑模式允许更新的字段白名单
const EDIT_FIELDS = ['title', 'icon', 'type', 'health_value', 'points_reward',
  'week_no', 'deadline', 'max_claim', 'estimated_time', 'status']

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()

  // 1. 验证管理员权限
  try {
    const checkRes = await cloud.callFunction({ name: 'checkAdmin' })
    const role = checkRes.result && checkRes.result.role
    if (role !== 'admin') {
      return fail('PERMISSION_DENIED', '只有管理员才能发布任务')
    }
  } catch (err) {
    return fail('PERMISSION_DENIED', '权限验证失败')
  }

  const { task_id } = event

  // ======== 编辑模式 ========
  if (task_id) {
    // 确认任务存在
    try {
      await db.collection('garden_tasks').doc(task_id).get()
    } catch (err) {
      return fail('TASK_NOT_FOUND', '任务不存在')
    }

    // 动态构建更新数据
    const updateData = {}
    const updatedFields = []

    for (const field of EDIT_FIELDS) {
      if (event[field] !== undefined && event[field] !== null) {
        updateData[field] = event[field]
        updatedFields.push(field)
      }
    }

    if (updatedFields.length === 0) {
      return fail('MISSING_FIELDS', '至少需要传入一个要更新的字段')
    }

    updateData.updated_at = db.serverDate()

    await db.collection('garden_tasks').doc(task_id).update({ data: updateData })

    return {
      success: true,
      task_id: task_id,
      updated_fields: updatedFields
    }
  }

  // ======== 新建模式 ========

  // 2. 校验必填字段
  const { title, icon, type, health_value, points_reward, week_no, deadline,
    max_claim, estimated_time } = event

  if (!title || !type || health_value === undefined || !week_no || !deadline) {
    return fail('MISSING_FIELDS', '缺少必填字段：title、type、health_value、week_no、deadline')
  }

  // 3. 校验 type
  if (type !== 'required' && type !== 'optional') {
    return fail('INVALID_TYPE', 'type 只能是 required 或 optional')
  }

  // 4. 校验数值字段
  if (!Number.isInteger(health_value) || health_value < 1) {
    return fail('INVALID_VALUES', 'health_value 必须是正整数')
  }
  const finalPoints = (points_reward !== undefined && points_reward !== null)
    ? points_reward : 0
  if (typeof finalPoints === 'number' && (!Number.isInteger(finalPoints) || finalPoints < 0)) {
    return fail('INVALID_VALUES', 'points_reward 必须是非负整数')
  }
  if (!Number.isInteger(week_no) || week_no < 1) {
    return fail('INVALID_VALUES', 'week_no 必须是正整数')
  }

  // 5. 插入新任务
  const newTask = {
    title: title,
    icon: icon || '',
    type: type,
    health_value: health_value,
    points_reward: finalPoints,
    week_no: week_no,
    deadline: new Date(deadline),
    max_claim: max_claim || 0,
    estimated_time: estimated_time || '',
    status: 'open',
    created_by: OPENID,
    created_at: db.serverDate()
  }

  const addRes = await db.collection('garden_tasks').add({ data: newTask })

  return {
    success: true,
    task_id: addRes._id
  }
}
