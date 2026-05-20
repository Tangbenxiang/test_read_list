// 测试 API 写权限：对已有函数执行 UpdateFunctionCode
const tencentcloud = require('tencentcloud-sdk-nodejs')
const ScfClient = tencentcloud.scf.v20180416.Client
const AdmZip = require('adm-zip')
const fs = require('fs')
const path = require('path')

const client = new ScfClient({
  credential: {
    secretId: process.env.TENCENT_SECRET_ID,
    secretKey: process.env.TENCENT_SECRET_KEY
  },
  region: 'ap-shanghai',
  profile: { httpProfile: { endpoint: 'scf.tencentcloudapi.com' } }
})

const functionDir = path.join(__dirname, '..', 'cloudfunctions', 'garden', 'getStatus')
const zip = new AdmZip()
zip.addLocalFile(path.join(functionDir, 'index.js'))
zip.addLocalFile(path.join(functionDir, 'package.json'))
const zipBase64 = zip.toBuffer().toString('base64')

async function main() {
  // 测试1: 对已有函数 checkAdmin 更新代码（用它的原代码回写，不改内容）
  console.log('=== 测试 UpdateFunctionCode (已有函数 checkAdmin) ===')
  try {
    const checkAdminDir = path.join(__dirname, '..', 'cloudfunctions', 'checkAdmin')
    const zip2 = new AdmZip()
    for (const f of fs.readdirSync(checkAdminDir)) {
      const full = path.join(checkAdminDir, f)
      if (fs.statSync(full).isFile()) zip2.addLocalFile(full)
    }
    const zip2Base64 = zip2.toBuffer().toString('base64')
    await client.UpdateFunctionCode({
      FunctionName: 'checkAdmin',
      Namespace: 'cloudbase-4gnknimqbe0440c9',
      ZipFile: zip2Base64
    })
    console.log('✓ UpdateFunctionCode 成功 - API 写权限正常\n')
  } catch (err) {
    console.log(`✗ UpdateFunctionCode 失败: ${err.message}\n`)
  }

  // 测试2: 用不同的 API 版本尝试 CreateFunction
  console.log('=== 测试 CreateFunction (2021 版 API) ===')
  const ScfClientV2 = tencentcloud.scf.v20180416.Client
  const clientV2 = new ScfClientV2({
    credential: {
      secretId: process.env.TENCENT_SECRET_ID,
      secretKey: process.env.TENCENT_SECRET_KEY
    },
    region: 'ap-shanghai',
    profile: {
      httpProfile: {
        endpoint: 'scf.tencentcloudapi.com',
        reqMethod: 'POST'
      }
    }
  })
  try {
    await clientV2.CreateFunction({
      FunctionName: 'getStatus',
      Namespace: 'cloudbase-4gnknimqbe0440c9',
      Runtime: 'Nodejs16.13',
      Handler: 'index.main',
      Type: 'Event',
      Code: { ZipFile: zipBase64 }
    })
    console.log('✓ CreateFunction 成功')
  } catch (err) {
    console.log(`✗ CreateFunction 失败: ${err.message}`)
    console.log(`   Error Code: ${err.code}`)
    console.log(`   RequestId: ${err.requestId}`)
  }
}

main().catch(console.error)
