# Refresh Token系统 - 快速使用指南

## 🚀 快速开始

### 1. 环境变量配置

```bash
# 添加到 .env 文件
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=your-refresh-token-secret-change-this
```

### 2. 数据库迁移

```bash
npx prisma migrate dev --name add_refresh_token_system
```

### 3. 新的OAuth回调参数

登录成功后，回调URL现在包含：
```
?access_token=eyJ...&refresh_token=eyJ...&expires_in=15m&success=true
```

## 📝 核心API

### 刷新Token
```http
POST /api/accounts/refresh
Content-Type: application/json

{
  "refresh_token": "eyJ..."
}
```

### 登出当前设备
```http
POST /api/accounts/logout
Authorization: Bearer <access_token>
```

### 登出所有设备
```http
POST /api/accounts/logout-all
Authorization: Bearer <access_token>
```

## 💻 前端集成

### 基础Token管理
```javascript
class TokenManager {
  setTokens(accessToken, refreshToken) {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    const response = await fetch('/api/accounts/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    const data = await response.json();
    if (data.success) {
      localStorage.setItem('access_token', data.data.access_token);
      return data.data.access_token;
    }
    throw new Error(data.message);
  }
}
```

### 自动刷新拦截器
```javascript
// 检查响应头中的新token
const newToken = response.headers.get('X-New-Access-Token');
if (newToken) {
  localStorage.setItem('access_token', newToken);
}

// 401错误时自动刷新
if (response.status === 401) {
  await tokenManager.refreshToken();
  // 重试请求
}
```

## 🔒 安全特性

- ✅ 短期Access Token（15分钟）
- ✅ 长期Refresh Token（7天）
- ✅ Token版本控制
- ✅ 设备级登出
- ✅ 全局登出
- ✅ 自动刷新机制
- ✅ 向后兼容

## 🔄 迁移步骤

1. **更新环境变量**
2. **运行数据库迁移**
3. **更新前端OAuth回调处理**
4. **实现Token刷新逻辑**
5. **测试登出功能**

详细文档请参考：`REFRESH_TOKEN_API.md`