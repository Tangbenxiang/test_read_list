// cloudfunctions/garden/addPhoto/index.js
// 管理员手动上传照片到成长相册
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
  const { OPENID } = cloud.getWXContext()
  const db = cloud.database()

  // 1. 验证管理员权限
  try {
    const checkRes = await cloud.callFunction({ name: 'checkAdmin' })
    const role = checkRes.result && checkRes.result.role
    if (role !== 'admin') {
      return { success: false, code: 'PERMISSION_DENIED', message: '只有管理员才能上传照片' }
    }
  } catch (err) {
    return { success: false, code: 'PERMISSION_DENIED', message: '权限验证失败' }
  }

  const { image_url, caption, week_no } = event
  if (!image_url) {
    return { success: false, code: 'MISSING_PARAMS', message: '缺少图片地址' }
  }

  // 2. 获取上传者信息
  let childName = ''
  try {
    const userRes = await db.collection('users')
      .where({ openid: OPENID })
      .field({ child_name: true })
      .get()
    if (userRes.data && userRes.data.length > 0) {
      childName = userRes.data[0].child_name || ''
    }
  } catch (err) {
    // 忽略，不影响上传
  }

  // 3. 确定周次：优先用传入值，否则从 garden_config 读取
  let weekNo = week_no
  if (!weekNo) {
    try {
      const configRes = await db.collection('garden_config').doc(GARDEN_CONFIG_ID).get()
      weekNo = configRes.data.week_no || 1
    } catch (err) {
      weekNo = 1
    }
  }

  // 4. 写入 garden_photos
  const addRes = await db.collection('garden_photos').add({
    data: {
      image_url,
      uploader_openid: OPENID,
      child_name: childName,
      week_no: weekNo,
      caption: caption || '',
      source: 'manual',
      taken_at: db.serverDate()
    }
  })

  return {
    success: true,
    _id: addRes._id
  }
}