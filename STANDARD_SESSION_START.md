# 标准会话启动提示词

## 📋 使用说明
每次开始新会话时，**完整复制以下内容**（包括分隔线），然后在最后添加你的具体任务要求。

---

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

---

## ⚡ 超简化版（单行）
```
请按标准会话流程执行：1)创建时间戳会话记录 2)检查项目状态 3)使用TodoWrite规划 4)执行我的要求：[具体任务]
```

## 📁 相关参考
- [PROMPT_TEMPLATE.md](PROMPT_TEMPLATE.md) - 完整提示词模板
- [SESSION_EXECUTION_GUIDE.md](SESSION_EXECUTION_GUIDE.md) - 详细执行指南
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) - 7周实施计划

*复制到此处结束*