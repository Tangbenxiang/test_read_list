# 会话执行指南

## 🚀 快速开始

每次会话开始时，请复制以下标准提示词：

```markdown
## 会话启动：按标准流程执行

### 步骤一：创建会话记录
请按照 [PROMPT_TEMPLATE.md](PROMPT_TEMPLATE.md) 规范，创建一个以当前时间命名的会话记录文件（格式：SESSION_SUMMARY_YYYYMMDD_HHMM.md），包含以下内容：
- 当前任务简述
- 项目状态快照（Git分支、最近提交、修改文件）
- 实施步骤规划

### 步骤二：快速项目浏览
请帮我快速浏览项目当前状态：
1. 使用TodoWrite工具规划本次任务
2. 检查Git状态：`git status` 和 `git log --oneline -3`
3. 查看关键文件状态：
   - [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) - 确认当前周计划
   - [cloudfunctions/user/](cloudfunctions/user/) - 检查用户系统云函数
   - [pages/register/](pages/register/) - 检查注册页面
   - [pages/profile/](pages/profile/) - 检查个人中心页面

### 步骤三：任务规划与执行
基于以上了解，请：
1. 使用TodoWrite将我的具体任务要求分解为可执行的步骤
2. 按照 [PROMPT_TEMPLATE.md](PROMPT_TEMPLATE.md) 中的任务规划模板结构化执行
3. 标记任务状态（待办/进行中/完成）

### 步骤四：记录与下一步
完成主要任务后：
1. 更新会话记录文件，记录已完成工作和重要文件
2. 根据 [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) 建议下一步计划
3. 检查是否有敏感文件需要处理

---

**我的具体任务要求是：**
[在这里粘贴你的具体任务描述]
```

---

## 📋 会话执行检查清单

### 启动阶段（AI执行）
- [ ] **创建会话记录文件** - 自动创建时间戳命名的记录文件
- [ ] **项目状态快照** - Git状态、最近提交、修改文件
- [ ] **TodoWrite规划** - 分解任务为可执行步骤

### 探索阶段（AI执行）
- [ ] **检查实施计划** - 查看IMPLEMENTATION_PLAN.md当前周任务
- [ ] **关键文件状态** - 相关云函数、页面、配置文件
- [ ] **Git状态分析** - 未提交的更改、冲突检查

### 执行阶段（AI执行）
- [ ] **任务分解** - 使用TodoWrite创建详细步骤
- [ ] **结构化执行** - 按任务规划模板逐步完成
- [ ] **状态跟踪** - 实时更新任务状态

### 收尾阶段（AI执行）
- [ ] **更新会话记录** - 记录成果、重要文件、问题
- [ ] **建议下一步** - 基于实施计划建议后续任务
- [ ] **安全检查** - 检查敏感文件、配置

---

## 🎯 项目状态快速获取命令

在标准提示词中使用的快速检查命令：

```bash
# Git状态
git status
git log --oneline -3

# 关键目录检查
ls -la cloudfunctions/user/
ls -la pages/register/
ls -la pages/profile/

# 文档检查
cat IMPLEMENTATION_PLAN.md | grep -A 10 "第1周"
```

---

## 📁 重要参考文件

| 文件 | 用途 | 会话中检查点 |
|------|------|-------------|
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | 7周实施计划 | 确认当前周任务、下一步计划 |
| [PROMPT_TEMPLATE.md](PROMPT_TEMPLATE.md) | 提示词模板 | 会话记录格式、任务规划模板 |
| [SESSION_SUMMARY_*.md](SESSION_SUMMARY_20260304_1641.md) | 会话记录 | 历史会话参考、连续性检查 |
| [cloudfunctions/user/](cloudfunctions/user/) | 用户系统云函数 | 第1周核心功能状态 |
| [pages/register/](pages/register/) | 注册页面 | 第2周任务准备状态 |
| [app.json](app.json) | 小程序配置 | 页面路由、权限配置 |

---

## 🗂️ 基于周计划的会话主题

### 第1周：用户系统基础
**核心任务**：
1. ✅ 用户云函数部署（register、getProfile、updateProfile）
2. 🔄 扩展checkAdmin为checkUserRole
3. ⏳ 创建预设头像资源（30个）
4. ⏳ 实现名字推荐算法

**相关文件**：
- `cloudfunctions/checkAdmin/index.js` → 修改为多角色
- `images/avatars/` → 创建头像资源
- 名字推荐算法 → 集成到register云函数

### 第2周：注册页面与个人中心
**核心任务**：
1. `pages/register/` - 匿名注册页面
2. `pages/profile/` - 个人中心页面
3. 微信登录集成
4. 首页用户集成

### 后续周计划
参考 [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) 获取完整计划

---

## ⚡ 简化版提示词（单行）

```
请按标准会话流程执行：1)创建时间戳会话记录 2)检查项目状态(Git+关键文件) 3)使用TodoWrite规划任务 4)执行我的要求：[具体任务]
```

---

## 💡 最佳实践提示

### 1. 任务描述明确性
**好**: "实现名字推荐算法，集成到register云函数中"
**不好**: "做名字推荐"

### 2. 文件引用规范化
**好**: "修改 [cloudfunctions/checkAdmin/index.js](cloudfunctions/checkAdmin/index.js) 支持多角色"
**不好**: "改那个权限文件"

### 3. 范围限定
**好**: "本次会话只完成头像资源的创建"
**不好**: "把用户系统做完"

### 4. 验收标准
**好**: "完成后应该能调用register云函数获得3个推荐名字"
**不好**: "做完告诉我"

---

## 🔄 连续性检查

每次会话开始时应检查：
1. **上次会话成果** - 查看最新的SESSION_SUMMARY_*.md
2. **计划对齐** - 当前任务是否符合IMPLEMENTATION_PLAN.md周计划
3. **文件一致性** - 相关文件是否处于预期状态
4. **Git状态** - 是否有未提交的重要更改

---

## 🆘 故障排除

### 常见问题
| 问题 | 检查点 | 解决方案 |
|------|--------|----------|
| 提示词不生效 | 1. 是否完整复制<br>2. 格式是否正确 | 重新复制标准提示词块 |
| 文件找不到 | 1. 路径是否正确<br>2. 文件是否存在 | 使用Glob工具搜索文件 |
| Git状态异常 | 1. 分支是否正确<br>2. 是否有冲突 | 使用`git status`详细检查 |
| 云函数问题 | 1. 环境ID是否正确<br>2. 函数是否已部署 | 检查部署状态和配置 |

### 快速恢复
如果会话中断或需要重新开始：
```markdown
## 会话恢复
请检查最新的会话记录文件，了解上次进度，然后继续执行我的要求：[具体任务]
```

---

*指南版本：v1.0*
*创建日期：2026-03-04*
*基于：[PROMPT_TEMPLATE.md](PROMPT_TEMPLATE.md) + [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)*