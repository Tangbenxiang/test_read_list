/**
 * 清理腾讯云 SCF 中 CreateFailed 状态的 garden 云函数
 *
 * 用法：
 *   1. npm install tencentcloud-sdk-nodejs --save-dev
 *   2. 填入你的 secretId 和 secretKey
 *   3. node scripts/delete-failed-functions.js
 */

const tencentcloud = require("tencentcloud-sdk-nodejs")
const ScfClient = tencentcloud.scf.v20180416.Client

// ============ 从环境变量读取密钥 ============
const secretId = process.env.TENCENT_SECRET_ID
const secretKey = process.env.TENCENT_SECRET_KEY
// ===========================================

const clientConfig = {
  credential: { secretId, secretKey },
  region: "ap-shanghai",
  profile: { httpProfile: { endpoint: "scf.tencentcloudapi.com" } }
}

const client = new ScfClient(clientConfig)

async function main() {
  if (!secretId || !secretKey) {
    console.error("请先填写 secretId 和 secretKey")
    process.exit(1)
  }

  // 1. 列出所有命名空间，找到云开发对应的
  console.log("=== 查询命名空间 ===")
  const nsRes = await client.ListNamespaces({})
  const namespaces = nsRes.Namespaces || []
  console.log(`共 ${namespaces.length} 个命名空间：`)
  namespaces.forEach(ns => {
    console.log(`  - ${ns.Name}  (描述: ${ns.Description || '无'})`)
  })

  // 找云开发环境的命名空间（通常和环境ID相关）
  // 用户可以手动指定，这里自动尝试匹配
  let targetNs = namespaces.find(ns => ns.Name.includes("cloudbase"))
  if (!targetNs) {
    // 如果找不到 cloudbase 开头的，列出所有让用户选择
    console.log("\n未找到 cloudbase 命名空间，请手动指定命名空间名称")
    return
  }
  console.log(`\n使用命名空间: ${targetNs.Name}\n`)

  // 2. 列出该命名空间下所有函数
  console.log("=== 查询云函数列表 ===")
  const fnRes = await client.ListFunctions({
    Namespace: targetNs.Name,
    Limit: 100
  })
  const functions = fnRes.Functions || []
  console.log(`共 ${functions.length} 个函数：\n`)

  const gardenFunctions = []
  functions.forEach(fn => {
    const status = fn.Status || 'Unknown'
    const marker = fn.FunctionName.includes("garden") ? " <-- garden 相关" : ""
    console.log(`  ${fn.FunctionName}  状态: ${status}${marker}`)
    if (fn.FunctionName.includes("garden")) {
      gardenFunctions.push(fn)
    }
  })

  if (gardenFunctions.length === 0) {
    console.log("\n没有找到 garden 相关的函数，无需清理")
    return
  }

  console.log(`\n=== 找到 ${gardenFunctions.length} 个 garden 函数，开始删除 ===\n`)

  // 3. 逐个删除
  for (const fn of gardenFunctions) {
    try {
      console.log(`删除: ${fn.FunctionName} (状态: ${fn.Status}) ...`)
      await client.DeleteFunction({
        FunctionName: fn.FunctionName,
        Namespace: targetNs.Name
      })
      console.log(`  ✓ 删除成功`)
    } catch (err) {
      console.log(`  ✗ 删除失败: ${err.message}`)
    }
  }

  console.log("\n=== 清理完成，可以回到开发者工具重新部署 ===")
}

main().catch(err => {
  console.error("执行出错:", err.message || err)
})
