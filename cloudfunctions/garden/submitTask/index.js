// cloudfunctions/garden/submitTask/index.js
// 家长完成任务后提交，附上照片
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

  // 1. 校验 record_id
  const { record_id, photos, note } = event
  if (!record_id) {
    return fail('RECORD_NOT_FOUND', '缺少记录ID')
  }

  // 2. 校验 photos：必须是数组、长度 1~3、每项非空字符串
  if (!Array.isArray(photos) || photos.length < 1 || photos.length > 3) {
    return fail('INVALID_PHOTOS', '请上传1~3张照片')
  }
  if (!photos.every(p => typeof p === 'string' && p.trim() !== '')) {
    return fail('INVALID_PHOTOS', '照片地址不能为空')
  }

  // 3. 查询记录
  let record
  try {
    const res = await db.collection('task_records').doc(record_id).get()
    record = res.data
  } catch (err) {
    return fail('RECORD_NOT_FOUND', '记录不存在')
  }

  // 4. 校验权限：openid 必须一致
  if (record.openid !== OPENID) {
    return fail('PERMISSION_DENIED', '不能提交别人的任务')
  }

  // 5. 校验状态：必须是 claimed
  if (record.status !== 'claimed') {
    if (record.status === 'submitted') {
      return fail('ALREADY_SUBMITTED', '任务已提交，请等待审核')
    }
    return fail('ALREADY_SUBMITTED', '当前状态不允许提交')
  }

  // 6. 更新记录
  await db.collection('task_records').doc(record_id).update({
    data: {
      photos: photos,
      note: note || '',
      status: 'submitted',
      submitted_at: db.serverDate()
    }
  })

  return { success: true }
}
