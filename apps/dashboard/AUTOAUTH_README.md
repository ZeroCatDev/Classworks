# AutoAuth 自动授权管理系统

## 🎯 功能概述

本系统为 ClassworksKV 提供了完整的自动授权管理功能，包括：

1. **自动授权配置管理** - 为设备创建和管理多个授权配置
2. **API 测试工具** - 测试自动授权、学生名称和 KV 操作
3. **功能导航** - 快速访问所有功能模块

## 📁 文件结构

```
src/
├── pages/
│   ├── auto-auth-management.vue    # 自动授权配置管理页面
│   ├── auto-auth-test.vue          # API 测试工具页面
│   └── index.vue                   # 主页（添加了导航入口）
├── components/
│   ├── AutoAuthConfigDialog.vue    # 配置编辑对话框
│   └── FeatureNavigation.vue       # 功能导航组件
└── lib/
    └── api.js                      # API 客户端（扩展了 AutoAuth 接口）
```

## 🚀 主要功能

### 1. 自动授权配置管理 (`/auto-auth-management`)

**功能特点：**
- ✅ 查看所有自动授权配置
- ✅ 创建新的授权配置
- ✅ 编辑现有配置
- ✅ 删除配置
- ✅ 支持多种设备类型（教师、学生、班级一体机、家长）
- ✅ 设置只读/读写权限
- ✅ 可选密码保护

**使用流程：**
1. 使用设备 UUID 和密码登录
2. 查看现有配置列表
3. 点击"添加配置"创建新配置
   - 设置授权密码（可选）
   - 选择设备类型
   - 设置只读权限
4. 保存后即可使用该配置

### 2. API 测试工具 (`/auto-auth-test`)

**功能特点：**
- 🔑 **Tab 1: 获取 Token** - 通过 namespace 和密码获取授权 token
- 👤 **Tab 2: 学生名称** - 为学生类型 token 设置名称
- 💾 **Tab 3: KV 操作** - 测试 LIST、GET、SET、DELETE 操作

**测试流程：**
1. 在自动授权配置页面创建配置
2. 使用 namespace 和密码获取 token
3. 如果是学生类型，设置学生名称
4. 测试 KV 操作验证权限

### 3. 功能导航组件

在主页底部新增了美观的功能导航区域，包括：
- 🛡️ 自动授权配置
- 🧪 API 测试工具
- 💾 KV 管理器
- 📱 设备管理
- ⚙️ 高级设置

## 🎨 UI 设计特点

### 使用 shadcn/vue 原生组件：
- ✅ `Card` - 卡片布局
- ✅ `Badge` - 状态标签
- ✅ `Dialog` - 对话框
- ✅ `Input` - 输入框
- ✅ `Select` - 下拉选择
- ✅ `Checkbox` - 复选框
- ✅ `Button` - 按钮
- ✅ `Tabs` - 标签页
- ✅ `AlertDialog` - 确认对话框

### 设计亮点：
- 🎨 渐变背景和悬停效果
- 🌈 设备类型图标和颜色区分
- 📱 响应式布局（移动端友好）
- 🔔 Toast 提示反馈
- ⚡ 加载状态和动画
- 🎯 清晰的视觉层次

## 🔌 API 接口集成

### 新增 API 方法（`api.js`）：

```javascript
// 获取自动授权配置列表
apiClient.getAutoAuthConfigs(deviceUuid, password)

// 创建自动授权配置
apiClient.createAutoAuthConfig(deviceUuid, password, config)

// 更新自动授权配置
apiClient.updateAutoAuthConfig(deviceUuid, password, configId, updates)

// 删除自动授权配置
apiClient.deleteAutoAuthConfig(deviceUuid, password, configId)

// 通过 namespace 获取 token
apiClient.getTokenByNamespace(namespace, password, appId)

// 设置学生名称
apiClient.setStudentName(token, name)
```

## 📝 设备类型说明

| 类型 | 值 | 说明 | 图标 | 典型权限 |
|------|-----|------|------|----------|
| 教师 | `teacher` | 教师端 | 🎓 | 读写 |
| 学生 | `student` | 学生端 | 👤 | 读写 |
| 班级一体机 | `classroom` | 班级大屏 | 🖥️ | 只读 |
| 家长 | `parent` | 家长端 | 👨‍👩‍👧 | 只读 |
| 未指定 | `null` | 无限制 | 🛡️ | 自定义 |

## 🔒 安全性

1. **密码哈希** - 所有密码使用 bcrypt 哈希存储
2. **认证要求** - 管理接口需要 UUID + 密码认证
3. **权限隔离** - 设备只能管理自己的配置
4. **只读保护** - 只读 token 无法执行写操作

## 💡 使用场景

### 场景 1：班级管理
```
1. 教师创建三个配置：
   - 教师密码：完整读写权限
   - 学生密码：读写权限
   - 家长密码：只读权限

2. 学生使用班级 namespace + 学生密码登录
3. 学生设置自己的名称
4. 家长使用家长密码查看数据
```

### 场景 2：公开展示
```
1. 创建无密码的只读配置
2. 任何人都可以通过 namespace 访问
3. 适用于班级大屏、展板等场景
```

## 🎯 后续优化建议

1. ✨ 添加配置模板功能
2. 📊 统计每个配置的使用情况
3. ⏰ 支持配置过期时间
4. 🔔 配置变更通知
5. 📝 配置使用日志

## 🐛 故障排查

### 问题 1：无法创建配置
- 检查设备密码是否正确
- 确认密码不与其他配置冲突

### 问题 2：获取 token 失败
- 验证 namespace 是否正确
- 检查密码是否匹配配置
- 确认配置未被删除

### 问题 3：KV 操作失败
- 确认 token 是否有效
- 检查是否为只读 token
- 验证 token 类型是否正确

## 📞 联系支持

如有问题，请查看：
- API 文档：`API_AUTOAUTH.md`
- 后端仓库：ClassworksServer
- 前端仓库：ClassworksKV Admin

---

**版本：** 1.0.0
**更新时间：** 2025-10-25
**作者：** GitHub Copilot
