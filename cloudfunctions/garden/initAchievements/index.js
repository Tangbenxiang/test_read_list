// cloudfunctions/garden/initAchievements/index.js
// 初始化菜园成就数据到 achievements 集合（仅运行一次）
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

const GARDEN_ACHIEVEMENTS = [
  { id: 'garden_first_claim', name: '初出茅庐', description: '第一次认领菜园任务', icon: '🌱', category: 'garden', condition_type: 'claim_count', condition_value: 1 },
  { id: 'garden_water_5', name: '浇水达人', description: '累计完成5次浇水任务', icon: '💧', category: 'garden', condition_type: 'water_count', condition_value: 5 },
  { id: 'garden_approved_3', name: '勤劳小农夫', description: '累计完成3个菜园任务', icon: '🧑‍🌾', category: 'garden', condition_type: 'approved_count', condition_value: 3 },
  { id: 'garden_approved_10', name: '丰收英雄', description: '累计完成10个菜园任务', icon: '🏆', category: 'garden', condition_type: 'approved_count', condition_value: 10 },
  { id: 'garden_full_week', name: '全勤小农夫', description: '某周内完成全部必选任务', icon: '⭐', category: 'garden', condition_type: 'full_week', condition_value: 1 }
]

exports.main = async (event, context) => {
  const db = cloud.database()

  // 验证管理员权限
  try {
    const checkRes = await cloud.callFunction({ name: 'checkAdmin' })
    if (checkRes.result && checkRes.result.role !== 'admin') {
      return { success: false, message: '仅管理员可执行' }
    }
  } catch (err) {
    return { success: false, message: '权限验证失败' }
  }

  const results = []
  for (const achievement of GARDEN_ACHIEVEMENTS) {
    // 检查是否已存在
    const existRes = await db.collection('achievements').where({ id: achievement.id }).get()
    if (existRes.data && existRes.data.length > 0) {
      results.push({ id: achievement.id, status: 'exists' })
      continue
    }
    // 插入新记录
    await db.collection('achievements').add({ data: achievement })
    results.push({ id: achievement.id, status: 'inserted' })
  }

  return { success: true, results }
}