# Refresh Token系统API文档

## 概述

ClassworksKV现在支持标准的Refresh Token认证系统，提供更安全的用户认证机制。新系统包含：

- **Access Token**: 短期令牌（默认15分钟），用于API访问
- **Refresh Token**: 长期令牌（默认7天），用于刷新Access Token
- **Token版本控制**: 支持令牌失效和安全登出
- **向后兼容**: 支持旧版JWT令牌

## 配置选项

可以通过环境变量配置token系统：

```bash
# Access Token配置
ACCESS_TOKEN_EXPIRES_IN=15m          # Access Token过期时间
REFRESH_TOKEN_EXPIRES_IN=7d          # Refresh Token过期时间

# 密钥配置（HS256算法）
JWT_SECRET=your-access-token-secret
REFRESH_TOKEN_SECRET=your-refresh-token-secret

# RSA密钥配置（RS256算法，可选）
JWT_ALG=RS256
ACCESS_TOKEN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
ACCESS_TOKEN_PUBLIC_KEY="-----BEGIN RSA PUBLIC KEY-----\n..."
REFRESH_TOKEN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
REFRESH_TOKEN_PUBLIC_KEY="-----BEGIN RSA PUBLIC KEY-----\n..."
```

## API端点

### 1. OAuth登录回调

OAuth登录成功后，系统会返回令牌对。

**回调URL参数（新版）：**
```
https://your-frontend.com/?access_token=eyJ...&refresh_token=eyJ...&expires_in=15m&success=true&provider=github
```

**旧版兼容参数：**
```
https://your-frontend.com/?token=eyJ...&success=true&provider=github
```

### 2. 刷新访问令牌

当Access Token即将过期或已过期时，使用Refresh Token获取新的Access Token。

**端点：** `POST /api/accounts/refresh`

**请求体：**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**响应（成功）：**
```json
{
  "success": true,
  "message": "令牌刷新成功",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": "15m",
    "account": {
      "id": "clxxxx",
      "provider": "github",
      "email": "user@example.com",
      "name": "User Name",
      "avatarUrl": "https://..."
    }
  }
}
```

**错误响应：**
```json
{
  "success": false,
  "message": "刷新令牌已过期"
}
```

**错误状态码：**
- `400`: 缺少刷新令牌
- `401`: 无效的刷新令牌、令牌已过期、账户不存在、令牌版本不匹配

### 3. 登出（当前设备）

撤销当前设备的Refresh Token，但不影响其他设备。

**端点：** `POST /api/accounts/logout`

**请求头：**
```
Authorization: Bearer <access_token>
```

**响应：**
```json
{
  "success": true,
  "message": "登出成功"
}
```

### 4. 登出所有设备

撤销账户的所有令牌，强制所有设备重新登录。

**端点：** `POST /api/accounts/logout-all`

**请求头：**
```
Authorization: Bearer <access_token>
```

**响应：**
```json
{
  "success": true,
  "message": "已从所有设备登出"
}
```

### 5. 获取令牌信息

查看当前令牌的详细信息和状态。

**端点：** `GET /api/accounts/token-info`

**请求头：**
```
Authorization: Bearer <access_token>
```

**响应：**
```json
{
  "success": true,
  "data": {
    "accountId": "clxxxx",
    "tokenType": "access",
    "tokenVersion": 1,
    "issuedAt": "2024-11-01T08:00:00.000Z",
    "expiresAt": "2024-11-01T08:15:00.000Z",
    "expiresIn": 900,
    "isExpired": false,
    "isLegacyToken": false,
    "hasRefreshToken": true,
    "refreshTokenExpiry": "2024-11-08T08:00:00.000Z"
  }
}
```

## 自动刷新机制

### 响应头刷新

当Access Token剩余有效期少于5分钟时，系统会在响应头中提供新的Access Token：

**响应头：**
```
X-New-Access-Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Token-Refreshed: true
```

前端应检查这些响应头并更新本地存储的token。

## 前端集成示例

### JavaScript/TypeScript

```javascript
class TokenManager {
  constructor() {
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }

  // 设置令牌对
  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  // 清除令牌
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  // 刷新访问令牌
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('/api/accounts/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: this.refreshToken
        }),
      });

      const data = await response.json();

      if (data.success) {
        this.accessToken = data.data.access_token;
        localStorage.setItem('access_token', this.accessToken);
        return this.accessToken;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      this.clearTokens();
      throw error;
    }
  }

  // API请求拦截器
  async request(url, options = {}) {
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // 检查是否有新的访问令牌
    const newAccessToken = response.headers.get('X-New-Access-Token');
    if (newAccessToken) {
      this.accessToken = newAccessToken;
      localStorage.setItem('access_token', newAccessToken);
    }

    // 如果token过期，尝试刷新
    if (response.status === 401) {
      try {
        await this.refreshAccessToken();
        // 重试请求
        return this.request(url, options);
      } catch (refreshError) {
        // 刷新失败，重定向到登录页
        window.location.href = '/login';
        throw refreshError;
      }
    }

    return response;
  }

  // 登出
  async logout() {
    try {
      await this.request('/api/accounts/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
      window.location.href = '/login';
    }
  }

  // 登出所有设备
  async logoutAll() {
    try {
      await this.request('/api/accounts/logout-all', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout all error:', error);
    } finally {
      this.clearTokens();
      window.location.href = '/login';
    }
  }
}

// 使用示例
const tokenManager = new TokenManager();

// OAuth回调处理
function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (accessToken && refreshToken) {
    tokenManager.setTokens(accessToken, refreshToken);
    // 重定向到应用主页
    window.location.href = '/dashboard';
  } else {
    // 处理旧版回调
    const legacyToken = params.get('token');
    if (legacyToken) {
      tokenManager.setTokens(legacyToken, null);
      window.location.href = '/dashboard';
    }
  }
}

// API调用示例
async function getUserProfile() {
  try {
    const response = await tokenManager.request('/api/accounts/profile');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to get user profile:', error);
    throw error;
  }
}
```

### React Hook

```jsx
import { useState, useCallback, useEffect } from 'react';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const tokenManager = new TokenManager();

  const checkAuth = useCallback(async () => {
    if (!tokenManager.accessToken) {
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    try {
      const response = await tokenManager.request('/api/accounts/profile');
      const data = await response.json();

      if (data.success) {
        setUser(data.data);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback((accessToken, refreshToken) => {
    tokenManager.setTokens(accessToken, refreshToken);
    setIsAuthenticated(true);
    checkAuth();
  }, [checkAuth]);

  const logout = useCallback(async () => {
    await tokenManager.logout();
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  return {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    tokenManager,
  };
}
```

## 安全考虑

### 1. Token存储
- **Access Token**: 可以存储在内存或localStorage中
- **Refresh Token**: 建议存储在httpOnly cookie中（需要后端支持），或者安全的本地存储

### 2. HTTPS
- 生产环境必须使用HTTPS传输令牌

### 3. Token轮换
- 系统支持令牌版本控制，可以快速失效所有令牌

### 4. 过期时间
- Access Token短期有效（15分钟）
- Refresh Token长期有效（7天）
- 可根据安全需求调整

## 迁移指南

### 从旧版JWT系统迁移

1. **前端更新**：
   - 更新OAuth回调处理逻辑
   - 实现Token刷新机制
   - 处理新的响应头

2. **向后兼容**：
   - 旧版JWT token仍然有效
   - 系统会在响应中标记`isLegacyToken: true`
   - 建议用户重新登录获取新令牌

3. **数据库迁移**：
   ```bash
   # 运行Prisma迁移
   npm run prisma migrate dev --name add_refresh_token_support
   ```

## 错误处理

### 常见错误

| 错误代码 | 错误信息 | 处理方式 |
|---------|---------|---------|
| 401 | JWT token已过期 | 使用refresh token刷新 |
| 401 | 无效的刷新令牌 | 重新登录 |
| 401 | 令牌版本不匹配 | 重新登录 |
| 401 | 账户不存在 | 重新登录 |

### 错误处理流程

```mermaid
graph TD
    A[API请求] --> B{Token有效?}
    B -->|是| C[返回数据]
    B -->|否,401错误| D{有Refresh Token?}
    D -->|否| E[重定向登录]
    D -->|是| F[尝试刷新Token]
    F --> G{刷新成功?}
    G -->|是| H[重试原请求]
    G -->|否| E
    H --> C
```

## 监控和日志

### 建议监控指标

- Token刷新频率
- Token刷新失败率
- 用户登出频率
- 异常登录尝试

### 日志记录

系统会记录以下事件：
- Token生成
- Token刷新
- Token撤销
- 认证失败

## 性能优化

### 1. Token缓存
- 在内存中缓存已验证的token（适用于高并发场景）

### 2. 数据库优化
- 为`refreshToken`字段添加索引
- 定期清理过期的refresh token

### 3. 前端优化
- 实现Token预刷新机制
- 使用Web Workers处理Token逻辑