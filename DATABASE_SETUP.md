# 数据库配置指南

## 1. 云开发环境设置

1. 在微信小程序管理后台（mp.weixin.qq.com）开通云开发服务
2. 创建云开发环境（如：`book-record-env`）
3. 获取环境ID

## 2. 数据库集合创建

### 2.1 创建books集合
1. 进入微信开发者工具 → 云开发控制台 → 数据库
2. 点击"+"号创建新集合，命名为 `books`
3. 集合权限设置：建议初始设置为"所有用户可读，仅创建者可写"

### 2.2 添加字段索引（建议）
为了提高查询性能，建议为以下字段创建索引：

| 字段名 | 索引类型 | 说明 |
|--------|----------|------|
| title | 全文索引 | 支持书名搜索 |
| author | 普通索引 | 作者查询优化 |
| type | 普通索引 | 书籍类型筛选优化 |
| gradeLevel | 普通索引 | 年级分类查询优化 |
| purchased | 普通索引 | 购买状态筛选优化 |
| read | 普通索引 | 阅读状态筛选优化 |
| intensiveRead | 普通索引 | 精读状态筛选优化 |
| serial | 普通索引 | 序号排序优化 |

### 2.3 集合结构
`books` 集合应包含以下字段：

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| _id | String | 是 | 自动生成 | 文档ID |
| serial | Number | 是 | - | 序号 |
| title | String | 是 | - | 书名 |
| type | String | 是 | - | 书籍类型 |
| author | String | 是 | - | 作者 |
| description | String | 否 | '' | 简介 |
| gradeLevel | String | 是 | - | 适合年级：一至二年级、三至四年级、五至六年级 |
| purchased | Boolean | 是 | false | 是否购买 |
| read | Boolean | 是 | false | 是否阅读 |
| intensiveRead | Boolean | 是 | false | 是否精读 |
| cover | String | 否 | '' | 封面图片URL |
| createTime | Date | 是 | serverDate | 创建时间 |
| updateTime | Date | 否 | serverDate | 更新时间 |

### 2.4 创建feedback集合（意见建议）
1. 进入微信开发者工具 → 云开发控制台 → 数据库
2. 点击"+"号创建新集合，命名为 `feedback`
3. 集合权限设置：建议设置为"所有用户可写，仅管理员可读"

#### 集合结构
`feedback` 集合应包含以下字段：

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| _id | String | 是 | 自动生成 | 文档ID |
| content | String | 是 | - | 反馈内容 |
| userInfo | Object | 否 | - | 用户信息（昵称、头像等） |
| contact | String | 否 | '匿名用户' | 联系方式 |
| status | String | 是 | 'pending' | 状态：pending（待处理）、reviewed（已查看）、resolved（已解决） |
| createTime | Date | 是 | serverDate | 创建时间 |

### 2.5 创建admins集合（管理员）
1. 进入微信开发者工具 → 云开发控制台 → 数据库
2. 点击"+"号创建新集合，命名为 `admins`
3. 集合权限设置：建议设置为"仅管理员可读写"

#### 集合结构
`admins` 集合应包含以下字段：

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| _id | String | 是 | 自动生成 | 文档ID |
| openid | String | 是 | - | 微信用户openid |
| nickname | String | 否 | - | 昵称 |
| role | String | 是 | 'admin' | 角色：admin（管理员） |
| createTime | Date | 是 | serverDate | 创建时间 |

## 3. 测试数据（可选）

如需添加测试数据，可以使用以下JSON格式：

```json
[
  {
    "serial": 1,
    "title": "《安徒生童话》",
    "type": "童话",
    "author": "安徒生",
    "description": "包含《丑小鸭》、《卖火柴的小女孩》等经典童话故事",
    "gradeLevel": "一至二年级",
    "purchased": true,
    "read": true,
    "intensiveRead": false,
    "cover": ""
  },
  {
    "serial": 2,
    "title": "《十万个为什么》",
    "type": "科普",
    "author": "少年儿童出版社",
    "description": "解答儿童常见科学问题，培养科学兴趣",
    "gradeLevel": "三至四年级",
    "purchased": true,
    "read": false,
    "intensiveRead": false,
    "cover": ""
  },
  {
    "serial": 3,
    "title": "《西游记》青少版",
    "type": "古典文学",
    "author": "吴承恩",
    "description": "中国古典四大名著之一，适合青少年阅读的版本",
    "gradeLevel": "五至六年级",
    "purchased": true,
    "read": true,
    "intensiveRead": true,
    "cover": ""
  }
]
```

## 4. 导入数据步骤

1. 准备JSON格式数据（可使用提供的Python脚本转换Excel）
2. 进入云开发控制台 → 数据库 → books集合
3. 点击"导入"按钮
4. 选择JSON文件，设置导入模式为"新增记录"
5. 点击"导入"开始批量导入

## 5. 云函数部署

1. 在微信开发者工具中，右键点击 `cloudfunctions` 目录下的每个云函数文件夹
2. 选择"上传并部署：云端安装依赖"
3. 需要部署的云函数：
   - `getCategoryStats` - 获取分类统计数据
   - `searchBooks` - 搜索书籍
   - `updateBookStatus` - 更新书籍状态
   - `initDatabase` - 数据库初始化检查
   - `getBookCoverFromDouban` - 从豆瓣获取书籍封面
   - `batchUpdateCovers` - 批量更新封面
   - `importTestBooks` - 导入测试数据
   - `checkAdmin` - 检查用户是否为管理员
   - `addBook` - 添加新书籍（需管理员权限）
   - `updateBookInfo` - 更新书籍信息（需管理员权限）

## 6. 环境配置

在 `app.js` 中更新环境ID：

```javascript
wx.cloud.init({
  env: '你的环境ID', // 替换为实际环境ID
  traceUser: true,
})
```

## 7. 验证配置

1. 运行小程序
2. 调用 `initDatabase` 云函数检查数据库配置
3. 测试各页面功能是否正常