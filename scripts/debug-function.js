// 临时调试：查看一个现有函数的完整配置
const tencentcloud = require('tencentcloud-sdk-nodejs')
const ScfClient = tencentcloud.scf.v20180416.Client

const client = new ScfClient({
  credential: {
    secretId: process.env.TENCENT_SECRET_ID,
    secretKey: process.env.TENCENT_SECRET_KEY
  },
  region: 'ap-shanghai',
  profile: { httpProfile: { endpoint: 'scf.tencentcloudapi.com' } }
})

async function main() {
  const res = await client.GetFunction({
    FunctionName: 'checkAdmin',
    Namespace: 'cloudbase-4gnknimqbe0440c9'
  })
  // 只打印关键配置，不打印代码
  const info = {
    FunctionName: res.FunctionName,
    Runtime: res.Runtime,
    Handler: res.Handler,
    Timeout: res.Timeout,
    MemorySize: res.MemorySize,
    Type: res.Type,
    Environment: res.Environment,
    VpcConfig: res.VpcConfig,
    LayerList: res.LayerList,
    Description: res.Description,
    Role: res.Role,
    ClsLogId: res.ClsLogId,
    L5Enable: res.L5Enable,
    OnsEnable: res.OnsEnable,
    Triggers: res.Triggers,
    InitTimeout: res.InitTimeout,
    Status: res.Status,
    StatusReasons: res.StatusReasons,
    EipConfig: res.EipConfig,
    AccessInfo: res.AccessInfo,
    ImageConfig: res.ImageConfig
  }
  console.log(JSON.stringify(info, null, 2))
}

main().catch(console.error)
