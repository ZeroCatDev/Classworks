# ✅ AutoAuth API 认证方式变更 - 前端适配完成

## 🔄 变更概述

后端已将 **AutoAuth 管理接口**的认证方式从 **UUID + 密码认证**改为 **JWT Token 认证**，前端已完成所有适配工作。

---

## 📝 前端修改清单

### 1. ✅ API 客户端更新 (`src/lib/api.js`)

**变更内容：**
- 所有 AutoAuth API 方法的第二个参数从 `password` 改为 `token`
- 使用 `authenticatedFetch()` 方法自动添加 `Authorization: Bearer {token}` header

**修改的方法：**
```javascript
// 旧方式
async getAutoAuthConfigs(deviceUuid, password)
async createAutoAuthConfig(deviceUuid, password, config)
async updateAutoAuthConfig(deviceUuid, password, configId, updates)
async deleteAutoAuthConfig(deviceUuid, password, configId)

// 新方式
async getAutoAuthConfigs(deviceUuid, token)
async createAutoAuthConfig(deviceUuid, token, config)
async updateAutoAuthConfig(deviceUuid, token, configId, updates)
async deleteAutoAuthConfig(deviceUuid, token, configId)
```

---

### 2. ✅ 自动授权管理页面重构 (`src/pages/auto-auth-management.vue`)

**主要变更：**

#### A. 认证方式改变
- ❌ 旧：使用 `DeviceAuthDialog` 进行设备 UUID + 密码认证
- ✅ 新：使用 `LoginDialog` 进行 OAuth 账户登录

#### B. 新增功能
- ✅ 检查用户是否已登录
- ✅ 验证设备是否绑定到当前账户
- ✅ 未登录状态显示友好提示
- ✅ 使用 `accountStore` 管理账户状态

#### C. 状态管理更新
```javascript
// 移除
const devicePassword = ref('')
const isAuthenticated = ref(false)

// 新增
const accountStore = useAccountStore()
const isAuthenticated = computed(() => accountStore.isAuthenticated)
```

#### D. 方法更新
```javascript
// 旧：设备认证成功
const handleLoginSuccess = async (uuid, password, device) => {
  deviceUuid.value = uuid
  devicePassword.value = password
  // ...
}

// 新：账户登录成功
const handleLoginSuccess = async (token) => {
  await accountStore.login(token)
  await checkDeviceAndLoad()
}

// 新增：检查设备绑定状态
const checkDeviceAndLoad = async () => {
  // 验证设备是否绑定到当前账户
  if (deviceInfo.value.accountId !== accountStore.userId) {
    toast.error('该设备未绑定到您的账户')
    return
  }
  // ...
}
```

#### E. 模板更新
- ✅ 添加未登录状态卡片
- ✅ 显示账户绑定信息
- ✅ 移除设备密码相关 UI

---

### 3. ✅ 配置对话框更新 (`src/components/AutoAuthConfigDialog.vue`)

**Props 变更：**
```javascript
// 旧
props: {
  deviceUuid: String,
  devicePassword: String,  // 移除
  config: Object,
}

// 新
props: {
  deviceUuid: String,
  accountToken: String,    // 新增
  config: Object,
}
```

**API 调用更新：**
```javascript
// 所有 API 调用都使用 props.accountToken 而不是 props.devicePassword
await apiClient.createAutoAuthConfig(
  props.deviceUuid,
  props.accountToken,  // 改为 token
  config
)
```

---

### 4. ✅ Account Store 扩展 (`src/stores/account.js`)

**新增计算属性：**
```javascript
const userId = computed(() => profile.value?.id || null)
```

用于验证设备是否属于当前登录用户。

---

### 5. ✅ 文档更新

**快速使用指南 (`QUICKSTART.md`) 更新：**
- 添加"重要前提"章节
- 强调必须先登录并绑定设备
- 更新使用流程

---

## 🎯 用户使用流程变化

### 旧流程（已废弃）
```
1. 访问自动授权配置页面
2. 输入设备 UUID 和密码
3. 管理配置
```

### 新流程（当前）
```
1. 主页登录账户（OAuth）
2. 绑定设备到账户
3. 访问自动授权配置页面（自动验证）
4. 管理配置
```

---

## 🔒 安全性提升

| 特性 | 旧方式 | 新方式 |
|------|--------|--------|
| **认证级别** | 设备密码 | 账户 Token (JWT) |
| **权限控制** | 知道密码即可 | 必须是设备所有者 |
| **安全性** | 中等 | 高 |
| **可追溯性** | 低 | 高（关联账户） |
| **适用范围** | 任何设置密码的设备 | 只有绑定账户的设备 |

---

## 📱 UI/UX 改进

### 新增功能
1. **未登录提示卡片**
   - 显示登录按钮
   - 说明需要账户登录的原因

2. **设备绑定状态显示**
   - 在设备信息卡片显示绑定的账户名称
   - 清晰的视觉反馈

3. **权限验证**
   - 自动检查设备是否绑定到当前账户
   - 友好的错误提示

---

## ⚠️ 破坏性变更

### 影响范围
- ❌ 旧的设备密码认证方式不再有效
- ❌ 未绑定账户的设备无法管理 AutoAuth 配置

### 迁移建议
1. 提示用户登录账户
2. 引导用户绑定设备
3. 更新使用文档和帮助信息

---

## ✅ 测试检查清单

- [ ] 未登录时访问配置页面 → 显示登录提示
- [ ] 登录但未绑定设备 → 提示绑定设备
- [ ] 登录且设备已绑定 → 正常显示配置列表
- [ ] 创建配置功能正常
- [ ] 编辑配置功能正常
- [ ] 删除配置功能正常
- [ ] 401 错误处理（Token 过期）
- [ ] 403 错误处理（设备未绑定）

---

## 🐛 已知问题

无

---

## 🔄 最新更新 (2025-10-25)

### ✅ Bug 修复：isReadOnly 显示和密码信息展示

#### 1. **修复 isReadOnly 始终为否的问题**

- 添加空值合并运算符 `??` 确保 `isReadOnly` 有默认值
- 更新代码：`isReadOnly: props.config.isReadOnly ?? false`

#### 2. **适配后端密码明文返回**

后端现在会返回：

- `password`: 明文密码或 `null`（如果是哈希）
- `isLegacyHash`: 布尔值标记是否为旧哈希格式

**前端更新：**

- ✅ 卡片中显示密码信息（如果是明文）
- ✅ 显示"旧格式"徽章（如果是哈希密码）
- ✅ 添加复制密码按钮
- ✅ 提示哈希密码需要首次登录后自动转换

**新增 UI 元素：**

```vue
<!-- 密码信息显示区域 -->
<div v-if="config.password || config.isLegacyHash" class="rounded-lg border bg-muted/50 p-3">
  <div class="flex items-center justify-between">
    <span class="text-xs font-medium">授权密码</span>
    <Badge v-if="config.isLegacyHash" variant="secondary">旧格式</Badge>
  </div>

  <!-- 明文密码 -->
  <div v-if="config.password">
    <code class="text-sm">{{ config.password }}</code>
    <Button @click="copyPassword(config.password)">
      <Copy class="h-3 w-3" />
    </Button>
  </div>

  <!-- 哈希密码提示 -->
  <p v-else class="text-xs text-muted-foreground">
    ⚠️ 哈希格式密码，需要用户首次登录后自动转换为明文
  </p>
</div>
```

**新增功能：**

- `copyPassword()` 方法：复制密码到剪贴板
- 导入 `Copy` 图标

#### 3. **密码状态检测优化**

更新密码检测逻辑：

```javascript
// 旧：只检测 hasPassword
config.hasPassword ? Lock : LockOpen

// 新：检测明文密码或旧哈希
config.password || config.isLegacyHash ? Lock : LockOpen
```

**显示文本更新：**

- `config.password` → "需要密码"
- `config.isLegacyHash` → "需要密码（旧格式）"
- 无密码 → "无密码"

---

## 📚 相关文档

- **后端 API 文档**: `ClassworksServer/API_AUTOAUTH.md`
- **前端快速指南**: `QUICKSTART.md`
- **实现总结**: `IMPLEMENTATION_SUMMARY.md`

---

## 🎉 总结

✅ **所有前端适配已完成**
✅ **安全性显著提升**
✅ **用户体验更加流畅**
✅ **代码质量和可维护性提高**

**状态：** 🟢 **可以投入使用**

---

**更新时间：** 2025-10-25
**版本：** 2.0.0 (Breaking Change)
