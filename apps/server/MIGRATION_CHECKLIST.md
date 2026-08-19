# Refresh Token系统迁移检查清单

## 🔧 服务端迁移

### 数据库
- [ ] 运行Prisma迁移: `npx prisma migrate dev --name add_refresh_token_system`
- [ ] 验证Account表新增字段: refreshToken, refreshTokenExpiry, tokenVersion

### 环境配置
- [ ] 添加 `ACCESS_TOKEN_EXPIRES_IN=15m`
- [ ] 添加 `REFRESH_TOKEN_EXPIRES_IN=7d`
- [ ] 添加 `REFRESH_TOKEN_SECRET=your-refresh-token-secret`
- [ ] （可选）配置RSA密钥对

### 代码验证
- [ ] `utils/tokenManager.js` 文件已创建
- [ ] `utils/jwt.js` 已更新（保持向后兼容）
- [ ] `middleware/jwt-auth.js` 已升级
- [ ] `routes/accounts.js` 新增refresh相关端点

## 🖥️ 前端迁移

### OAuth回调处理
- [ ] 更新回调URL参数解析（支持access_token和refresh_token）
- [ ] 保持对旧版token参数的兼容性
- [ ] 实现TokenManager类

### Token管理
- [ ] 实现Token刷新逻辑
- [ ] 添加请求拦截器检查X-New-Access-Token响应头
- [ ] 实现401错误自动重试机制
- [ ] 添加登出功能（单设备/全设备）

### 存储策略
- [ ] Access Token存储（localStorage/sessionStorage）
- [ ] Refresh Token安全存储
- [ ] 实现Token清理逻辑

## 🧪 测试验证

### 功能测试
- [ ] OAuth登录流程测试
- [ ] Token自动刷新测试
- [ ] 手动refresh接口测试
- [ ] 登出功能测试（单设备）
- [ ] 登出功能测试（全设备）
- [ ] Token信息查看测试

### 兼容性测试
- [ ] 旧版JWT token仍然有效
- [ ] 新旧token混合使用场景
- [ ] API向后兼容性验证

### 错误处理测试
- [ ] 过期token处理
- [ ] 无效refresh token处理
- [ ] 网络错误重试
- [ ] 并发刷新场景

## 📊 监控配置

### 日志记录
- [ ] Token生成日志
- [ ] Token刷新日志
- [ ] 认证失败日志
- [ ] 登出操作日志

### 性能监控
- [ ] Token刷新频率统计
- [ ] API响应时间监控
- [ ] 数据库查询性能

## 🔒 安全检查

### Token安全
- [ ] 密钥强度验证
- [ ] Token过期时间配置合理
- [ ] HTTPS传输确认
- [ ] 敏感信息不在日志中暴露

### 访问控制
- [ ] Token撤销功能正常
- [ ] 版本控制机制有效
- [ ] 设备隔离正确

## 📚 文档检查

- [ ] API文档已更新
- [ ] 前端集成指南已提供
- [ ] 迁移步骤文档完整
- [ ] 错误处理指南清晰

## 🚀 上线准备

### 部署前
- [ ] 代码review完成
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 性能测试通过

### 部署时
- [ ] 数据库迁移执行
- [ ] 环境变量配置
- [ ] 服务重启验证
- [ ] 健康检查通过

### 部署后
- [ ] 新用户登录测试
- [ ] 现有用户功能正常
- [ ] 监控指标正常
- [ ] 错误日志检查

## 🔄 回滚计划

### 紧急回滚
- [ ] 回滚代码到上一版本
- [ ] 恢复原环境变量
- [ ] 数据库回滚方案（如需要）

### 数据迁移回滚
- [ ] 备份新增字段数据
- [ ] 移除新增字段的迁移脚本
- [ ] 验证旧版功能正常

---

**检查完成人员**: ___________
**检查完成时间**: ___________
**环境**: [ ] 开发 [ ] 测试 [ ] 生产