# AutoAuth 和新增 Apps API 文档

## 概述

本文档描述了自动授权 (AutoAuth) 相关的 API 接口以及新增的应用管理接口。

---

## Apps API 新增接口

### 1. 通过 namespace 和密码获取 token

**端点**: `POST /apps/auth/token`

**描述**: 通过设备的 namespace 和密码进行自动授权，创建新的 AppInstall 并返回 token。

**请求体**:
```json
{
  "namespace": "string (必填)",
  "password": "string (可选，根据自动授权配置)",
  "appId": "string (必填)"
}
```

**成功响应** (201 Created):
```json
{
  "success": true,
  "token": "string",
  "deviceType": "string | null",
  "isReadOnly": boolean,
  "installedAt": "datetime"
}
```

**错误响应**:
- `400 Bad Request`: 缺少必填字段
- `404 Not Found`: 设备不存在或 namespace 不正确
- `401 Unauthorized`: 密码不正确或需要提供密码

**说明**:
- 该接口会查找匹配的 AutoAuth 配置
- 如果提供了密码，会验证密码是否匹配任何自动授权配置
- 如果没有提供密码，会查找无密码的自动授权配置
- 根据匹配的 AutoAuth 配置设置 `deviceType` 和 `isReadOnly` 属性

---

### 2. 设置学生名称

**端点**: `POST /apps/tokens/:token/set-student-name`

**描述**: 为学生类型的 token 设置名称（更新 note 字段）。

**URL 参数**:
- `token`: AppInstall 的 token

**请求体**:
```json
{
  "name": "string (必填)"
}
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "token": "string",
  "name": "string",
  "updatedAt": "datetime"
}
```

**错误响应**:
- `400 Bad Request`: 缺少名称或名称不在学生列表中
- `403 Forbidden`: token 类型不是 student
- `404 Not Found`: token 不存在或设备未设置学生列表

**说明**:
- 只有 `deviceType` 为 `student` 的 token 才能使用此接口
- 会验证提供的名称是否存在于设备的 `classworks-list-main` 键值中
- 学生列表格式: `[{"id": 1, "name": "学生1"}, {"id": 2, "name": "学生2"}]`

---

## AutoAuth 管理 API

> 🔐 **所有 AutoAuth 管理接口都需要 JWT Account Token 认证**
>
> **重要**: 只有已绑定账户的设备才能使用这些接口。未绑定账户的设备无法管理 AutoAuth 配置。
>
> 通过 HTTP Headers 提供：
> - `Authorization`: `Bearer {jwt_token}` - 账户的 JWT Token

### 1. 获取设备的自动授权配置列表

**端点**: `GET /auto-auth/devices/:uuid/auth-configs`

**认证**: 需要 JWT Token (账户必须是设备的拥有者)

**URL 参数**:
- `uuid`: 设备的 UUID

**成功响应** (200 OK):
```json
{
  "success": true,
  "configs": [
    {
      "id": "string",
      "hasPassword": boolean,
      "deviceType": "string | null",
      "isReadOnly": boolean,
      "createdAt": "datetime",
      "updatedAt": "datetime"
    }
  ]
}
```

**说明**:
- 返回的配置不包含实际的密码哈希值，只显示是否有密码

---

### 2. 创建自动授权配置

**端点**: `POST /auto-auth/devices/:uuid/auth-configs`

**认证**: 需要 JWT Token (账户必须是设备的拥有者)

**URL 参数**:
- `uuid`: 设备的 UUID

**请求体**:
```json
{
  "password": "string (可选)",
  "deviceType": "string (可选: teacher|student|classroom|parent)",
  "isReadOnly": boolean (可选，默认 false)
}
```

**成功响应** (201 Created):
```json
{
  "success": true,
  "config": {
    "id": "string",
    "hasPassword": boolean,
    "deviceType": "string | null",
    "isReadOnly": boolean,
    "createdAt": "datetime"
  }
}
```

**错误响应**:
- `400 Bad Request`: 设备类型无效或密码配置已存在

**说明**:
- 同一设备的密码必须唯一（包括空密码）
- `deviceType` 必须是 `teacher`、`student`、`classroom`、`parent` 之一，或为空

---

### 3. 更新自动授权配置

**端点**: `PUT /auto-auth/devices/:uuid/auth-configs/:configId`

**认证**: 需要 JWT Token (账户必须是设备的拥有者)

**URL 参数**:
- `uuid`: 设备的 UUID
- `configId`: 自动授权配置的 ID

**请求体**:
```json
{
  "password": "string (可选)",
  "deviceType": "string (可选: teacher|student|classroom|parent)",
  "isReadOnly": boolean (可选)
}
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "config": {
    "id": "string",
    "hasPassword": boolean,
    "deviceType": "string | null",
    "isReadOnly": boolean,
    "updatedAt": "datetime"
  }
}
```

**错误响应**:
- `400 Bad Request`: 设备类型无效或新密码与其他配置冲突
- `403 Forbidden`: 无权操作此配置
- `404 Not Found`: 配置不存在

**说明**:
- 只能更新属于当前设备的配置
- 更新密码时会检查是否与该设备的其他配置冲突

---

### 4. 删除自动授权配置

**端点**: `DELETE /auto-auth/devices/:uuid/auth-configs/:configId`

**认证**: 需要 JWT Token (账户必须是设备的拥有者)

**URL 参数**:
- `uuid`: 设备的 UUID
- `configId`: 自动授权配置的 ID

**成功响应** (204 No Content):
- 无响应体

**错误响应**:
- `403 Forbidden`: 无权操作此配置
- `404 Not Found`: 配置不存在

**说明**:
- 只能删除属于当前设备的配置

---

## 设备类型 (deviceType)

可选的设备类型值:
- `teacher`: 教师
- `student`: 学生
- `classroom`: 班级一体机
- `parent`: 家长
- `null`: 未指定类型

---

## 使用流程示例

### 场景 1: 学生使用 namespace 登录

1. 学生输入班级的 namespace 和密码
2. 调用 `POST /apps/auth/token` 获取 token
3. 使用返回的 token 访问 KV 存储
4. 如果是学生类型，调用 `POST /apps/tokens/:token/set-student-name` 设置自己的名称

### 场景 2: 管理员配置自动授权

1. 管理员通过账户登录获取 JWT Token
2. 调用 `POST /auto-auth/devices/:uuid/auth-configs` 创建多个授权配置：
   - 教师密码（deviceType: teacher, isReadOnly: false）
   - 学生密码（deviceType: student, isReadOnly: false）
   - 家长密码（deviceType: parent, isReadOnly: true）
3. 学生/教师/家长使用对应密码通过 namespace 登录

**注意**: 设备必须已绑定到管理员的账户才能配置 AutoAuth

---

## 注意事项

1. **密码安全**: 所有密码都使用 bcrypt 进行哈希存储
2. **唯一性约束**:
   - 同一设备的 namespace 必须唯一
   - 同一设备的 AutoAuth 密码必须唯一（包括 null）
3. **级联删除**: 删除设备会级联删除所有相关的 AutoAuth 配置和 AppInstall 记录
4. **只读限制**: isReadOnly 为 true 的 token 在 KV 操作中会受到写入限制
5. **账户绑定要求**: 只有已绑定账户的设备才能管理 AutoAuth 配置，未绑定账户的设备无法使用 AutoAuth 管理接口
