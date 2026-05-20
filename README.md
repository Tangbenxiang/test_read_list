# 儿童阅读记录 & 班级菜园 - 微信小程序

> 基于微信云开发的儿童阅读记录管理工具 + 班级共享菜园互动模块。

---

## 项目概况

| 属性 | 信息 |
|------|------|
| 平台 | 微信小程序（原生开发） |
| 后端 | 微信云开发（云函数 + 云数据库） |
| AppID | `wxc2d712752b0caacc` |
| 云环境 | `cloudbase-4gnknimqbe0440c9` |
| 定位 | 班级阅读记录 + 菜园互动管理工具 |
| 主题 | 冰雪蓝色系 (#A0D6FF / #66B3FF / #0066CC)，菜园模块加入绿色元素 |

### 已实现功能

- **书籍管理** - 批量导入、增删改查、封面管理
- **分类浏览** - 按年级分类（一至二年级 / 三至四年级 / 五至六年级）
- **搜索筛选** - 书名/作者/类型模糊搜索，多条件组合筛选
- **状态跟踪** - 购买、阅读、精读三种状态标记
- **计划阅读** - 添加书籍到计划列表，在详情页切换状态
- **数据统计** - 首页展示各分类书籍数量统计
- **用户系统** - 家长注册（含孩子姓名）、多角色权限（admin硬编码）
- **阅读挑战** - 创建/参与挑战，答题评分（已开发，未启用）
- **意见反馈** - 用户提交反馈到云数据库
- **班级菜园** - 底部Tab独立入口，健康值展示、任务认领与提交、管理后台、成长相册

### 开发进度

| 阶段 | 状态 | 内容 |
|------|------|------|
| 第零步：注册流程改造 | ✅ 已完成 | `user/register` 增加 child_name/class_id，role 固定 parent；`checkAdmin` 改造支持 guest 状态 |
| 第一期：基础可用 | ✅ 已完成 | 菜园主页、任务大厅、我的任务页面 + 8个云函数 + TabBar集成 |
| 第二期：任务闭环 | ✅ 已完成 | 管理员审核/发布页面 + 待审核列表 + 照片审核 |
| 第三期：体验提升 | ✅ 已完成 | 成长相册（时间轴）、健康值定时衰减、菜园成就系统 |

---

## 目录结构

```
├── app.js                          # 入口文件：云初始化、登录状态管理
├── app.json                        # 全局配置（含tabBar：读书/菜园）
├── app.wxss                        # 全局样式
├── project.config.json             # 项目配置
├── .gitignore
│
├── pages/                          # 页面
│   ├── index/                      # [核心] 首页 - 统计面板、菜园状态卡片、分类导航、计划阅读
│   ├── list/                       # [核心] 书籍列表 - 分类展示、筛选、分页
│   ├── detail/                     # [核心] 书籍详情 - 信息展示、状态切换
│   ├── search/                     # [核心] 搜索 - 模糊搜索、历史记录
│   ├── addbook/                    # [管理] 添加书籍
│   ├── editbook/                   # [管理] 编辑书籍
│   ├── manualcover/                # [管理] 手动上传封面
│   ├── feedback/                   # [功能] 意见反馈
│   ├── debug/                      # [工具] 调试页面
│   ├── register/                   # [用户] 家长注册 - 孩子姓名、匿名名字、头像
│   ├── profile/                    # [用户] 个人中心
│   ├── challenge/                  # [挑战] 答题界面
│   ├── challenge-list/             # [挑战] 挑战列表
│   ├── sharing/                    # [占位] 阅读分享墙
│   ├── sharing-detail/             # [占位] 分享详情
│   ├── ranking/                    # [占位] 排行榜
│   ├── parent/                     # [占位] 家长监控面板
│   ├── achievements/               # [成就] 成就系统（菜园成就已接入）
│   ├── family/                     # [占位] 家庭关联
│   └── garden/                     # [菜园] 菜园模块页面
│       ├── index/                  #   菜园主页 - 健康值进度条 + 阶段展示 + 本周任务卡片 + 相册入口
│       ├── tasks/                  #   任务大厅 - 必选/选做任务列表 + 认领 + 详情弹窗
│       ├── my-tasks/               #   我的任务 - Tab切换(待完成/待审核/已完成) + 提交完成+照片上传
│       ├── photos/                 #   成长相册 - 按周分组时间轴 + 全屏预览 + 管理员上传
│       └── admin/                  #   管理后台 - 菜园状态更新 + 任务发布/关闭 + 审核通过/驳回
│
├── cloudfunctions/                  # 云函数
│   ├── checkAdmin/                 # [核心] 身份与权限检查
│   ├── initDatabase/               # [核心] 数据库初始化
│   ├── getCategoryStats/           # [书籍] 分类统计
│   ├── searchBooks/                # [书籍] 模糊搜索
│   ├── addBook/                    # [书籍] 添加书籍
│   ├── updateBookStatus/           # [书籍] 更新书籍状态
│   ├── updateBookInfo/             # [书籍] 更新书籍信息
│   ├── getBookCoverFromDouban/     # [工具] 获取封面
│   ├── batchUpdateCovers/          # [工具] 批量更新封面
│   ├── importTestBooks/            # [工具] 导入测试数据
│   ├── user/register/              # [用户] 家长注册（role固定parent，含child_name）
│   ├── user/getProfile/            # [用户] 获取用户信息
│   ├── user/updateProfile/         # [用户] 更新用户信息
│   ├── addPlannedBook/             # [计划] 添加计划阅读
│   ├── getPlannedBooks/            # [计划] 获取计划阅读列表
│   ├── deletePlannedBook/          # [计划] 删除计划阅读
│   ├── challenge/create/           # [挑战] 创建挑战
│   ├── challenge/getWeekly/        # [挑战] 获取本周挑战
│   ├── challenge/getHistory/       # [挑战] 获取历史挑战
│   ├── challenge/getDetail/        # [挑战] 获取挑战详情
│   ├── challenge/submit/           # [挑战] 提交挑战答案
│   └── garden/                     # [菜园] 菜园模块云函数（13个）
│       ├── getStatus/              #   获取菜园当前状态 + 健康值档位 + 任务概览
│       ├── getTasks/               #   获取任务列表 + 认领状态
│       ├── claimTask/              #   家长认领任务（含完整校验）
│       ├── submitTask/             #   提交任务完成 + 照片
│       ├── approveTask/            #   管理员审核 + 加健康值/积分/同步相册/检查成就
│       ├── updateConfig/           #   管理员更新菜园配置
│       ├── publishTask/            #   管理员发布/编辑任务
│       ├── getMyTasks/             #   获取当前用户任务记录（关联任务详情）
│       ├── getPendingRecords/      #   获取待审核记录列表
│       ├── getPhotos/              #   获取成长相册（按周分组）
│       ├── addPhoto/               #   管理员手动上传照片到相册
│       ├── scheduleDecay/          #   定时触发：每周健康值衰减-20
│       ├── checkAchievements/      #   审核通过后检查菜园成就解锁
│       └── initAchievements/       #   初始化菜园成就数据到achievements集合
│
├── images/
│   ├── default-cover.png           # 默认书籍封面
│   ├── tab-book.png                # TabBar图标 - 读书（灰色）
│   ├── tab-book-active.png         # TabBar图标 - 读书（蓝色选中）
│   ├── tab-garden.png              # TabBar图标 - 菜园（灰色）
│   ├── tab-garden-active.png       # TabBar图标 - 菜园（蓝色选中）
│   └── avatars/                    # 预设头像（待替换）
│
├── plan/                           # 开发计划
│   ├── 菜园模块开发计划.html         # 菜园模块完整开发计划文档
│   └── 启动提示词.md                # 开发进度跟踪文档
│
├── scripts/                        # 运维脚本
│   ├── deploy-function.js          # 云函数部署（通过 TencentCloud API 上传代码）
│   ├── delete-failed-functions.js  # 清理 CreateFailed 状态的云函数
│   └── debug-function.js           # 查询云函数详细配置
│
└── convert_excel_to_json.py        # 工具：Excel书籍数据转JSON
```

---

## 数据库设计

### 集合总览

| 集合 | 状态 | 用途 |
|------|------|------|
| `books` | 使用中 | 书籍信息 |
| `admins` | 使用中 | 管理员openid列表 |
| `feedback` | 使用中 | 用户反馈 |
| `users` | 使用中 | 用户档案（含child_name、class_id） |
| `user_planned_books` | 使用中 | 计划阅读记录 |
| `weekly_challenges` | 已建表 | 阅读挑战定义 |
| `challenge_responses` | 已建表 | 挑战答题记录 |
| `reading_shares` | 已建表 | 阅读分享（未启用） |
| `family_connections` | 已建表 | 家庭关联（未启用） |
| `achievements` | 使用中 | 菜园成就定义（已初始化5条） |
| `garden_config` | 使用中 | 菜园全局状态（仅1条记录，固定 _id） |
| `garden_tasks` | 使用中 | 菜园任务库 |
| `task_records` | 使用中 | 任务认领和完成记录 |
| `garden_photos` | 使用中 | 成长相册 |

### users 集合字段

```
openid: string          # 微信openid（唯一）
anonymousName: string   # 匿名昵称
avatarIndex: number     # 预设头像编号 0-29
role: string            # 角色（parent / admin）
child_name: string      # 孩子姓名（注册时必填）
class_id: string        # 班级ID（当前固定 "2026_class1"）
real_name: string       # 家长称呼（选填）
points: number          # 积分
achievements: array     # 成就列表
readingStats: object    # 阅读统计
settings: object        # 用户设置
createTime / lastLoginTime: date
```

---

## 核心架构说明

### 页面导航

```
TabBar
├── 读书 → pages/index/index（首页）
│   ├── 菜园状态卡片 → switchTab → 菜园主页
│   ├── 书籍列表、搜索、详情等 → navigateTo
│   └── 计划阅读等 → navigateTo
│
└── 菜园 → pages/garden/index（菜园主页）
    ├── 任务大厅 → navigateTo → pages/garden/tasks
    ├── 我的任务 → navigateTo → pages/garden/my-tasks
    ├── 成长相册 → navigateTo → pages/garden/photos
    └── 管理后台 → 个人中心入口 → pages/garden/admin（仅管理员可见）
```

### 用户身份与权限

```
app.js onLaunch
  → checkLogin() → wx.cloud.callFunction({ name: 'checkAdmin' })
    → 硬编码管理员openid匹配 → users集合role字段 → admins集合（兼容）
    → 存入 globalData.loginStatus / userInfo / openid
    → 未注册用户返回 guest 状态（不再自动创建）
```

### 数据流

```
用户操作 → pages/*.js → wx.cloud.callFunction({ name, data })
                              ↓
                    cloudfunctions/*/index.js
                              ↓
                    cloud.database().collection('xxx')
                              ↓
                    返回结果 → this.setData() 更新UI
```

### 菜园模块核心流程

```
管理员发布任务 → garden_tasks 集合
家长认领任务 → claimTask → task_records（status: claimed）
家长提交完成 → 照片上传云存储 → submitTask → task_records（status: submitted）
管理员审核 → approveTask → 加健康值 + 加积分 + 同步相册 + 检查成就（status: approved）
每周一定时衰减 → scheduleDecay → 健康值 -20（最低0）
```

---

## 开发注意事项

- **单次查询20条**：云数据库限制，需使用批量分页查询
- **OpenID大小写**：比较时统一用 `.toLowerCase()`
- **garden_config只有1条记录**：用 `doc(id).update()`，不要用 `add()`
- **garden_config 固定 _id**：`81704b8e6a0bffd700d3cfee1543e82c`
- **TabBar页面跳转**：必须用 `wx.switchTab`，不能用 `wx.navigateTo`；switchTab 不支持 URL 参数，用 `globalData` 传递
- **WXML限制**：模板中不能使用 `new Date()` 等 JS 构造函数；style 属性不支持模板值与字面量直接拼接（如 `{{color}}15`）

### 云函数部署

由于微信开发者工具对嵌套目录部署存在 Bug（`CreateFailed` 状态），使用 API 脚本部署：

```bash
# 1. 先在云开发控制台手动创建空函数（函数名如 getStatus，运行环境 Nodejs18.15）
#    控制台地址：https://console.cloud.tencent.com/tcb/scf/index

# 2. 用脚本上传代码
node scripts/deploy-function.js getStatus garden

# 查看所有函数状态
node scripts/deploy-function.js list

# 清理 CreateFailed 状态的函数
node scripts/delete-failed-functions.js
```

**注意**：
- 腾讯云 TCB 环境禁止通过 `CreateFunction` API 创建新函数（报 `InvalidParameterValue.Stamp`），所以必须先在控制台手动创建
- `UpdateFunctionCode` API 正常可用，脚本通过此接口上传代码
- 嵌套云函数在 SCF 侧是**扁平命名**的（如 `garden/getStatus` → SCF 函数名 `getStatus`）
- 部署脚本依赖 `tencentcloud-sdk-nodejs` 和 `adm-zip`（已安装在项目根 `node_modules`）

---

## 参考文档

| 文档 | 说明 |
|------|------|
| [菜园模块开发计划](plan/菜园模块开发计划.html) | 菜园模块完整设计（数据库、云函数、页面、排期） |
| [开发进度跟踪](plan/启动提示词.md) | 当前进度、待开发任务、关键技术信息 |
| 微信小程序文档 | https://developers.weixin.qq.com/miniprogram/dev/ |
| 云开发文档 | https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html |
