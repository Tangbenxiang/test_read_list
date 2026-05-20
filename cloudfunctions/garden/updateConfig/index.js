// cloudfunctions/garden/updateConfig/index.js
// 管理员手动更新菜园状态（阶段推进、健康值调整等）
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

// 允许更新的字段白名单
const ALLOWED_FIELDS = ['health_point', 'current_stage', 'stage_desc', 'stage_image', 'week_no']

const fail = (code, message) => ({ success: false, code, message })

exports.main = async (event, context) => {
  const db = cloud.database()

  // 1. 验证管理员权限
  try {
    const checkRes = await cloud.callFunction({ name: 'checkAdmin' })
    const role = checkRes.result && checkRes.result.role
    if (role !== 'admin') {
      return fail('PERMISSION_DENIED', '只有管理员才能修改菜园配置')
    }
  } catch (err) {
    return fail('PERMISSION_DENIED', '权限验证失败')
  }

  // 2. 动态构建更新数据，只包含传入的白名单字段
  const updateData = {}
  const updatedFields = []

  for (const field of ALLOWED_FIELDS) {
    if (event[field] !== undefined && event[field] !== null) {
      updateData[field] = event[field]
      updatedFields.push(field)
    }
  }

  if (updatedFields.length === 0) {
    return fail('NO_UPDATE_FIELDS', '至少需要传入一个要更新的字段')
  }

  // 3. 校验 health_point：0~100 的数字
  if (updateData.health_point !== undefined) {
    if (typeof updateData.health_point !== 'number' || updateData.health_point < 0 || updateData.health_point > 100) {
      return fail('INVALID_HEALTH_POINT', 'health_point 必须是 0~100 的数字')
    }
  }

  // 4. 校验 week_no：正整数
  if (updateData.week_no !== undefined) {
    if (!Number.isInteger(updateData.week_no) || updateData.week_no < 1) {
      return fail('INVALID_WEEK_NO', 'week_no 必须是正整数')
    }
  }

  // 5. 加上更新时间
  updateData.last_updated = db.serverDate()

  // 6. 更新 garden_config
  await db.collection('garden_config').doc(GARDEN_CONFIG_ID).update({
    data: updateData
  })

  return {
    success: true,
    updated_fields: updatedFields
  }
}
