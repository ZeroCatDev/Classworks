# Socket.IO 实时频道接口文档（前端）

## 概述

ClassworksKV 提供基于 Socket.IO 的实时键值变更通知服务。前端使用 **KV token**（应用安装 token）加入频道，服务端会自动将 token 映射到对应设备的 uuid 房间。**同一设备的不同 token 会被归入同一频道**，因此多个客户端/应用可以共享实时更新。

**重要变更**：不再支持直接使用 uuid 加入频道，所有连接必须使用有效的 KV token。

## 安装依赖

前端项目安装 Socket.IO 客户端：

```bash
# npm
npm install socket.io-client

# pnpm
pnpm add socket.io-client

# yarn
yarn add socket.io-client
```

## 连接服务器

### 基础连接

```typescript
import { io, Socket } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3000'; // 替换为实际服务器地址

const socket: Socket = io(SERVER_URL, {
  transports: ['websocket'],
});
```

### 连接时自动加入频道（推荐）

在连接握手时通过 query 参数传入 token，自动加入对应设备频道：

```typescript
const socket = io(SERVER_URL, {
  transports: ['websocket'],
  query: {
    token: '<your-kv-app-token>', // 或使用 apptoken 参数
  },
});

// 监听加入成功
socket.on('joined', (info) => {
  console.log('已加入频道:', info);
  // { by: 'token', uuid: 'device-uuid-xxx' }
});

// 监听加入失败
socket.on('join-error', (error) => {
  console.error('加入频道失败:', error);
  // { by: 'token', reason: 'invalid_token' }
});
```

## 事件接口

### 1. 客户端发送的事件

#### `join-token` - 使用 token 加入频道

连接后按需加入频道。

**载荷格式：**
```typescript
{
  token?: string;   // KV token（二选一）
  apptoken?: string; // 或使用 apptoken 字段
}
```

**示例：**
```typescript
socket.emit('join-token', { token: '<your-kv-app-token>' });
```

---

#### `leave-token` - 使用 token 离开频道

离开指定 token 对应的设备频道。

**载荷格式：**
```typescript
{
  token?: string;
  apptoken?: string;
}
```

**示例：**
```typescript
socket.emit('leave-token', { token: '<your-kv-app-token>' });
```

---

#### `leave-all` - 离开所有频道

断开前清理，离开该连接加入的所有设备频道。

**载荷：** 无

**示例：**
```typescript
socket.emit('leave-all');
```

---

### 2. 服务端发送的事件

#### `joined` - 加入成功通知

当成功加入频道后，服务端会发送此事件。

**载荷格式：**
```typescript
{
  by: 'token';
  uuid: string; // 设备 uuid（用于调试/日志）
}
```

**示例：**
```typescript
socket.on('joined', (info) => {
  console.log(`成功加入设备 ${info.uuid} 的频道`);
});
```

---

#### `join-error` - 加入失败通知

token 无效或查询失败时触发。

**载荷格式：**
```typescript
{
  by: 'token';
  reason: 'invalid_token'; // 失败原因
}
```

**示例：**
```typescript
socket.on('join-error', (error) => {
  console.error('Token 无效，无法加入频道');
});
```

---

#### `kv-key-changed` - 键值变更广播

当设备下的 KV 键被创建/更新/删除时，向该设备频道内所有连接广播此事件。

**载荷格式：**
```typescript
{
  uuid: string;           // 设备 uuid
  key: string;            // 变更的键名
  action: 'upsert' | 'delete'; // 操作类型

  // 仅 action='upsert' 时存在：
  created?: boolean;      // 是否首次创建
  updatedAt?: string;     // 更新时间（ISO 8601）
  batch?: boolean;        // 是否为批量导入中的单条

  // 仅 action='delete' 时存在：
  deletedAt?: string;     // 删除时间（ISO 8601）
}
```

**示例：**
```typescript
socket.on('kv-key-changed', (msg) => {
  if (msg.action === 'upsert') {
    console.log(`键 ${msg.key} 已${msg.created ? '创建' : '更新'}`);
    // 刷新本地缓存或重新获取数据
  } else if (msg.action === 'delete') {
    console.log(`键 ${msg.key} 已删除`);
    // 从本地缓存移除
  }
});
```

**载荷示例：**

- 新建/更新键：
  ```json
  {
    "uuid": "device-001",
    "key": "settings/theme",
    "action": "upsert",
    "created": false,
    "updatedAt": "2025-10-25T08:30:00.000Z"
  }
  ```

- 删除键：
  ```json
  {
    "uuid": "device-001",
    "key": "settings/theme",
    "action": "delete",
    "deletedAt": "2025-10-25T08:35:00.000Z"
  }
  ```

- 批量导入中的单条：
  ```json
  {
    "uuid": "device-001",
    "key": "config/version",
    "action": "upsert",
    "created": true,
    "updatedAt": "2025-10-25T08:40:00.000Z",
    "batch": true
  }
  ```

---

#### `device-joined` - 设备频道连接数变化（可选）

当有新连接加入某设备频道时广播，用于显示在线人数。

**载荷格式：**
```typescript
{
  uuid: string;       // 设备 uuid
  connections: number; // 当前连接数
}
```

**示例：**
```typescript
socket.on('device-joined', (info) => {
  console.log(`设备 ${info.uuid} 当前有 ${info.connections} 个连接`);
});
```

---

## 完整使用示例

### React Hook 封装

```typescript
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

interface KvKeyChange {
  uuid: string;
  key: string;
  action: 'upsert' | 'delete';
  created?: boolean;
  updatedAt?: string;
  deletedAt?: string;
  batch?: boolean;
}

export function useKvChannel(
  token: string | null,
  onKeyChanged?: (event: KvKeyChange) => void
) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    // 创建连接并加入频道
    const socket = io(SERVER_URL, {
      transports: ['websocket'],
      query: { token },
    });

    socket.on('joined', (info) => {
      console.log('已加入设备频道:', info.uuid);
    });

    socket.on('join-error', (err) => {
      console.error('加入频道失败:', err.reason);
    });

    socket.on('kv-key-changed', (msg: KvKeyChange) => {
      onKeyChanged?.(msg);
    });

    socketRef.current = socket;

    return () => {
      socket.emit('leave-all');
      socket.close();
    };
  }, [token]);

  return socketRef.current;
}
```

### Vue Composable 封装

```typescript
import { ref, watch, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export function useKvChannel(token: Ref<string | null>) {
  const socket = ref<Socket | null>(null);
  const isConnected = ref(false);
  const deviceUuid = ref<string | null>(null);

  watch(token, (newToken) => {
    // 清理旧连接
    if (socket.value) {
      socket.value.emit('leave-all');
      socket.value.close();
      socket.value = null;
    }

    if (!newToken) return;

    // 创建新连接
    const s = io(SERVER_URL, {
      transports: ['websocket'],
      query: { token: newToken },
    });

    s.on('connect', () => {
      isConnected.value = true;
    });

    s.on('disconnect', () => {
      isConnected.value = false;
    });

    s.on('joined', (info) => {
      deviceUuid.value = info.uuid;
      console.log('已加入设备频道:', info.uuid);
    });

    s.on('join-error', (err) => {
      console.error('加入失败:', err.reason);
    });

    socket.value = s;
  }, { immediate: true });

  onUnmounted(() => {
    if (socket.value) {
      socket.value.emit('leave-all');
      socket.value.close();
    }
  });

  return { socket, isConnected, deviceUuid };
}
```

### 使用示例（React）

```tsx
import { useKvChannel } from './hooks/useKvChannel';

function MyComponent() {
  const token = localStorage.getItem('kv-token');

  useKvChannel(token, (event) => {
    console.log('KV 变更:', event);

    if (event.action === 'upsert') {
      // 更新本地状态或重新获取数据
      fetchKeyValue(event.key);
    } else if (event.action === 'delete') {
      // 从本地移除
      removeFromCache(event.key);
    }
  });

  return <div>实时监听中...</div>;
}
```

---

## REST API：查询在线设备

除了 Socket.IO 实时事件，还提供 HTTP 接口查询当前在线设备列表。

### `GET /devices/online`

**响应格式：**
```typescript
{
  success: true;
  devices: Array<{
    uuid: string;        // 设备 uuid
    connections: number; // 当前连接数
    name: string | null; // 设备名称（若已设置）
  }>;
}
```

**示例：**
```typescript
const response = await fetch(`${SERVER_URL}/devices/online`);
const data = await response.json();

console.log('在线设备:', data.devices);
// [{ uuid: 'device-001', connections: 3, name: 'My Device' }, ...]
```

---

## 获取 KV Token

前端需要先获取有效的 KV token 才能加入频道。Token 通过以下接口获取：

### 安装应用获取 token

**接口：** `POST /apps/devices/:uuid/install/:appId`

**认证：** 需要设备 UUID 认证（密码或账户 JWT）

**响应包含：**
```typescript
{
  id: string;
  appId: string;
  token: string;      // 用于 KV 操作和加入频道
  note: string | null;
  name: string | null; // 等同于 note，便于展示
  installedAt: string;
}
```

### 列出设备已有的 token

**接口：** `GET /apps/tokens?uuid=<device-uuid>`

**响应：**
```typescript
{
  success: true;
  tokens: Array<{
    id: string;
    token: string;
    appId: string;
    installedAt: string;
    note: string | null;
    name: string | null; // 等同于 note
  }>;
  deviceUuid: string;
}
```

---

## 注意事项与最佳实践

1. **Token 必需**：所有连接必须提供有效的 KV token，不再支持直接使用 uuid。

2. **频道归并**：同一设备的不同 token 会自动归入同一房间（以设备 uuid 为房间名），因此多个应用/客户端可以共享实时更新。

3. **连接管理**：
   - 组件卸载时调用 `leave-all` 或 `leave-token` 清理连接
   - 避免频繁创建/销毁连接，建议在应用全局维护单个 socket 实例

4. **重连处理**：
   - Socket.IO 客户端内置自动重连
   - 在 `connect` 事件后重新 emit `join-token` 确保重连后仍在频道内（或在握手时传 token 自动加入）

5. **CORS 配置**：
   - 服务端通过环境变量 `FRONTEND_URL` 控制允许的来源
   - 未设置时默认为 `*`（允许所有来源）
   - 生产环境建议设置为前端实际域名

6. **错误处理**：
   - 监听 `join-error` 事件处理 token 无效情况
   - 监听 `connect_error` 处理网络连接失败

7. **性能优化**：
   - 批量导入时会逐条广播，前端可根据 `batch: true` 标记做去抖处理
   - 建议在本地维护 KV 缓存，收到变更通知时增量更新而非全量刷新

---

## 环境变量配置

服务端需要配置以下环境变量：

```env
# Socket.IO CORS 允许的来源
FRONTEND_URL=http://localhost:5173

# 服务器端口（可选，默认 3000）
PORT=3000
```

---

## 常见问题

### Q: 如何支持多个设备？

A: 对每个设备的 token 分别调用 `join-token`，或在连接时传入一个 token，后续通过事件加入其他设备。

```typescript
socket.emit('join-token', { token: token1 });
socket.emit('join-token', { token: token2 });
```

### Q: 广播延迟有多大？

A: 通常在毫秒级，取决于网络状况。WebSocket 连接建立后，广播几乎实时。

### Q: Token 过期怎么办？

A: Token 本身不会过期，除非手动删除应用安装记录。如收到 `join-error`，检查 token 是否已被卸载。

### Q: 可以在 Node.js 后端使用吗？

A: 可以，使用相同的 socket.io-client 包，接口完全一致。

---

## 更新日志

### v1.1.0 (2025-10-25)

**破坏性变更：**
- 移除直接使用 uuid 加入频道的接口（`join-device` / `leave-device`）
- 现在必须使用 KV token 通过 `join-token` 或握手 query 加入

**新增：**
- `leave-all` 事件：离开所有已加入的频道
- 握手时支持 `token` 和 `apptoken` 两种参数名

**改进：**
- 同一设备的不同 token 自动归入同一房间
- 优化在线设备计数准确性

---

## 技术支持

如有问题，请查阅：
- 服务端源码：`utils/socket.js`
- KV 路由：`routes/kv-token.js`
- 设备管理：`routes/device.js`

或提交 Issue 到项目仓库。
