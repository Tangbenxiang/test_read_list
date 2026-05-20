/**
 * 云函数部署脚本 - 通过 TencentCloud API 上传代码
 *
 * 前提：函数必须已存在于云控制台（手动创建或通过开发者工具创建）
 * 本脚本只负责上传代码（UpdateFunctionCode），不创建函数
 *
 * 用法：
 *   node scripts/deploy-function.js <函数名> [父目录]
 *   node scripts/deploy-function.js list
 *
 * 示例：
 *   node scripts/deploy-function.js getStatus garden
 *   node scripts/deploy-function.js list
 */

const fs = require('fs')
const path = require('path')
const AdmZip = require('adm-zip')
const tencentcloud = require('tencentcloud-sdk-nodejs')
const ScfClient = tencentcloud.scf.v20180416.Client

// ============ 配置（从环境变量读取密钥） ============
const secretId = process.env.TENCENT_SECRET_ID
const secretKey = process.env.TENCENT_SECRET_KEY
const namespace = 'cloudbase-4gnknimqbe0440c9'
const region = 'ap-shanghai'
// ===============================

const client = new ScfClient({
  credential: { secretId, secretKey },
  region,
  profile: { httpProfile: { endpoint: 'scf.tencentcloudapi.com' } }
})

// 打包目录为 base64 zip
function zipDirectory(dirPath) {
  const zip = new AdmZip()
  const files = fs.readdirSync(dirPath)

  for (const file of files) {
    const fullPath = path.join(dirPath, file)
    const stat = fs.statSync(fullPath)
    if (file === 'node_modules') continue
    if (stat.isDirectory()) {
      zip.addLocalFolder(fullPath, file)
    } else {
      zip.addLocalFile(fullPath)
    }
  }

  return zip.toBuffer().toString('base64')
}

// 检查函数是否存在
async function functionExists(functionName) {
  try {
    const res = await client.GetFunction({ FunctionName: functionName, Namespace: namespace })
    return { exists: true, status: res.Status }
  } catch (err) {
    if (err.code === 'ResourceNotFound.Function') return { exists: false }
    throw err
  }
}

async function main() {
  const args = process.argv.slice(2)

  // 列表模式
  if (args[0] === 'list') {
    console.log('=== 云函数列表 ===')
    const res = await client.ListFunctions({ Namespace: namespace, Limit: 100 })
    for (const fn of (res.Functions || [])) {
      const status = fn.Status === 'Active' ? '✓' : `✗ (${fn.Status})`
      console.log(`  ${status} ${fn.FunctionName}`)
    }
    return
  }

  if (args.length === 0) {
    console.log('用法:')
    console.log('  node scripts/deploy-function.js list              # 查看所有函数')
    console.log('  node scripts/deploy-function.js <名> [父目录]      # 部署函数代码')
    process.exit(1)
  }

  const functionName = args[0]
  const parentDir = args[1] || ''

  const baseDir = path.join(__dirname, '..', 'cloudfunctions')
  const functionDir = parentDir
    ? path.join(baseDir, parentDir, functionName)
    : path.join(baseDir, functionName)

  if (!fs.existsSync(functionDir)) {
    console.error(`错误: 目录不存在 ${functionDir}`)
    process.exit(1)
  }

  console.log(`=== 部署: ${functionName} ===`)

  // 1. 打包
  console.log('[1/3] 打包代码...')
  const zipBase64 = zipDirectory(functionDir)
  console.log(`  ✓ ${(zipBase64.length * 0.75 / 1024).toFixed(1)} KB`)

  // 2. 检查状态
  console.log('[2/3] 检查函数...')
  const check = await functionExists(functionName)
  if (!check.exists) {
    console.error(`  ✗ 函数 "${functionName}" 不存在！`)
    console.error(`  请先在云开发控制台手动创建这个函数，然后再运行部署。`)
    console.error(`  控制台地址: https://console.cloud.tencent.com/tcb/scf/index`)
    process.exit(1)
  }
  if (check.status === 'CreateFailed') {
    console.log(`  函数处于 CreateFailed 状态，尝试先删除再重建...`)
    try {
      await client.DeleteFunction({ FunctionName: functionName, Namespace: namespace })
      console.log('  ✓ 删除成功，等待 5 秒...')
      await new Promise(r => setTimeout(r, 5000))
      // 删除后无法通过 API 重建，需要提示用户手动创建
      console.error(`  请在云控制台重新创建函数 "${functionName}"，然后再运行部署。`)
      process.exit(1)
    } catch (delErr) {
      console.error(`  ✗ 删除失败: ${delErr.message}`)
      process.exit(1)
    }
  }
  console.log(`  ✓ 状态: ${check.status}`)

  // 3. 上传代码
  console.log('[3/3] 上传代码...')
  try {
    await client.UpdateFunctionCode({
      FunctionName: functionName,
      Namespace: namespace,
      ZipFile: zipBase64
    })
    console.log('  ✓ 部署成功')
  } catch (err) {
    console.error(`  ✗ 上传失败: ${err.message}`)
    process.exit(1)
  }

  console.log(`\n=== 完成: ${functionName} ===`)
}

main().catch(err => {
  console.error('执行出错:', err.message || err)
  process.exit(1)
})
