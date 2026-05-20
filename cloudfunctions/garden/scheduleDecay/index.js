// cloudfunctions/garden/scheduleDecay/index.js
// 定时触发：每周自动扣减健康值（-20，最低0）
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
  const db = cloud.database()

  try {
    // 1. 读取当前健康值
    const configRes = await db.collection('garden_config').doc(GARDEN_CONFIG_ID).get()
    const oldHealth = configRes.data.health_point || 0

    // 2. 计算新健康值（减20，最低0）
    const newHealth = Math.max(0, oldHealth - 20)

    // 3. 更新 garden_config
    await db.collection('garden_config').doc(GARDEN_CONFIG_ID).update({
      data: {
        health_point: newHealth,
        last_updated: db.serverDate()
      }
    })

    console.log(`健康值衰减: ${oldHealth} → ${newHealth}`)

    return {
      success: true,
      old_health: oldHealth,
      new_health: newHealth
    }
  } catch (error) {
    console.error('健康值衰减失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}