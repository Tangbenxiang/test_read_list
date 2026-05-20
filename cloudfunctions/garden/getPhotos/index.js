// cloudfunctions/garden/getPhotos/index.js
// 获取成长相册，按周分组返回
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
  const db = cloud.database()

  try {
    // 1. 查询所有照片，按拍摄时间倒序
    const photosRes = await db.collection('garden_photos')
      .orderBy('taken_at', 'desc')
      .get()

    const photos = photosRes.data || []

    if (photos.length === 0) {
      return { success: true, data: { photos_by_week: {}, week_list: [], total: 0 } }
    }

    // 2. 按 week_no 分组
    const photosByWeek = {}
    for (const p of photos) {
      const week = p.week_no || 1
      if (!photosByWeek[week]) {
        photosByWeek[week] = []
      }
      photosByWeek[week].push({
        _id: p._id,
        image_url: p.image_url,
        child_name: p.child_name || '',
        caption: p.caption || '',
        taken_at: p.taken_at,
        week_no: week
      })
    }

    // 3. 提取 week_list（倒序，最新在前）
    const weekList = Object.keys(photosByWeek)
      .map(Number)
      .sort((a, b) => b - a)

    return {
      success: true,
      data: {
        photos_by_week: photosByWeek,
        week_list: weekList,
        total: photos.length
      }
    }
  } catch (error) {
    console.error('获取相册失败:', error)
    return { success: false, code: 'SERVER_ERROR', message: error.message }
  }
}