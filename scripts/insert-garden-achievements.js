/**
 * 插入菜园成就数据到 achievements 集合
 * 运行方式：node scripts/insert-garden-achievements.js
 */
const tencentcloud = require('tencentcloud-sdk-nodejs')
const ScfClient = tencentcloud.scf.v20180416.Client

const secretId = process.env.TENCENT_SECRET_ID
const secretKey = process.env.TENCENT_SECRET_KEY
const namespace = 'cloudbase-4gnknimqbe0440c9'
const region = 'ap-shanghai'

const client = new ScfClient({
  credential: { secretId, secretKey },
  region,
  profile: { httpProfile: { endpoint: 'scf.tencentcloudapi.com' } }
})

const achievements = [
  {
    id: 'garden_first_claim',
    name: '初出茅庐',
    description: '第一次认领菜园任务',
    icon: '🌱',
    category: 'garden',
    condition_type: 'claim_count',
    condition_value: 1
  },
  {
    id: 'garden_water_5',
    name: '浇水达人',
    description: '累计完成5次浇水任务',
    icon: '💧',
    category: 'garden',
    condition_type: 'water_count',
    condition_value: 5
  },
  {
    id: 'garden_approved_3',
    name: '勤劳小农夫',
    description: '累计完成3个菜园任务',
    icon: '🧑‍🌾',
    category: 'garden',
    condition_type: 'approved_count',
    condition_value: 3
  },
  {
    id: 'garden_approved_10',
    name: '丰收英雄',
    description: '累计完成10个菜园任务',
    icon: '🏆',
    category: 'garden',
    condition_type: 'approved_count',
    condition_value: 10
  },
  {
    id: 'garden_full_week',
    name: '全勤小农夫',
    description: '某周内完成全部必选任务',
    icon: '⭐',
    category: 'garden',
    condition_type: 'full_week',
    condition_value: 1
  }
]

async function main() {
  // 调用 initDatabase 云函数来插入数据
  // 由于无法直接操作云数据库，我们通过云函数来插入
  // 先检查 initDatabase 是否支持插入 achievements

  // 方案：通过调用云函数 insertGardenAchievements（需要新建）
  // 更简单的方案：直接在云开发控制台手动插入

  console.log('=== 菜园成就数据 ===')
  console.log('请在云开发控制台 → 数据库 → achievements 集合中手动插入以下 5 条记录：')
  console.log('')
  console.log(JSON.stringify(achievements, null, 2))
  console.log('')
  console.log('或者，你也可以在云开发控制台的「云函数」中，')
  console.log('临时运行以下代码来批量插入：')
  console.log('')
  console.log('const db = cloud.database()')
  console.log('const achievements = ' + JSON.stringify(achievements, null, 2))
  console.log('for (const a of achievements) {')
  console.log('  await db.collection("achievements").add({ data: a })')
  console.log('}')
}

main().catch(err => {
  console.error('执行出错:', err.message || err)
  process.exit(1)
})