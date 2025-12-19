# 技术决策理由 - MCP HTTP Transport

**项目**: Midscene MCP HTTP Transport  
**决策日期**: 2025-10-15

## 🎯 核心架构决策

### 决策 1: 传输路由器模式

**背景**: 需要在不破坏现有 stdio 传输的情况下添加 HTTP 传输支持。

**选项对比**:

| 选项 | 优点 | 缺点 | 评分 |
|------|------|------|------|
| A. 硬编码切换 | 简单直接 | 不灵活，难以扩展 | 2/5 |
| B. 传输路由器 | 灵活，易扩展，向后兼容 | 稍微复杂 | 5/5 ✅ |
| C. 两个独立包 | 完全隔离 | 代码重复，维护成本高 | 3/5 |

**最终决策**: 选择 B - 传输路由器模式

**理由**:
1. **向后兼容**: 默认 stdio 模式，现有客户端无需修改
2. **灵活性**: 通过环境变量轻松切换传输模式
3. **可扩展**: 未来可以轻松添加新的传输方式（WebSocket, gRPC）
4. **代码复用**: 核心业务逻辑完全共享
5. **最小侵入**: 只需修改主入口文件

**实施细节**:
```typescript
// 传输路由器根据配置选择传输方式
const router = new TransportRouter();
const { transport, httpServer } = await router.createTransport();
```

---

### 决策 2: 独立的会话管理器

**背景**: HTTP 传输需要管理多个并发客户端会话。

**选项对比**:

| 选项 | 优点 | 缺点 | 评分 |
|------|------|------|------|
| A. 内置在 HTTP 服务器 | 简单 | 耦合度高，难以测试 | 2/5 |
| B. 独立 SessionManager | 单一职责，易测试 | 稍微复杂 | 5/5 ✅ |
| C. 使用外部存储 | 可扩展 | 依赖外部服务，过度设计 | 3/5 |

**最终决策**: 选择 B - 独立的 SessionManager 类

**理由**:
1. **单一职责**: SessionManager 只负责会话管理
2. **易于测试**: 可以独立测试会话逻辑
3. **可维护性**: 清晰的接口和职责边界
4. **灵活性**: 未来可以轻松切换到 Redis 等外部存储
5. **性能**: 内存存储满足当前需求（50+ 并发会话）

**实施细节**:
```typescript
export class SessionManager {
  private sessions = new Map<string, MCPSession>();
  private cleanupInterval?: NodeJS.Timeout;
  
  createSession(sessionId: string): MCPSession { ... }
  closeSession(sessionId: string): boolean { ... }
  cleanupExpiredSessions(): void { ... }
}
```

---

### 决策 3: Express.js 作为 HTTP 框架

**背景**: 需要选择 HTTP 框架来包装 StreamableHTTPServerTransport。

**选项对比**:

| 选项 | 优点 | 缺点 | 评分 |
|------|------|------|------|
| A. 原生 http 模块 | 无依赖 | 功能少，需要自己实现中间件 | 2/5 |
| B. Express.js | 成熟，生态丰富 | 稍重 | 5/5 ✅ |
| C. Fastify | 性能好 | 生态较小，学习成本 | 4/5 |
| D. Koa | 现代，轻量 | 中间件生态较小 | 3/5 |

**最终决策**: 选择 B - Express.js

**理由**:
1. **成熟稳定**: 最流行的 Node.js HTTP 框架
2. **丰富的中间件**: CORS, 速率限制等开箱即用
3. **易于使用**: 简单直观的 API
4. **社区支持**: 大量文档和示例
5. **团队熟悉**: 降低学习成本

**依赖选择**:
- `express`: 核心框架
- `cors`: CORS 中间件
- `express-rate-limit`: 速率限制

---

### 决策 4: 环境变量配置

**背景**: 需要设计配置系统。

**选项对比**:

| 选项 | 优点 | 缺点 | 评分 |
|------|------|------|------|
| A. 配置文件 | 结构化 | 部署复杂，不符合 12-factor | 3/5 |
| B. 环境变量 | 符合 12-factor，易部署 | 类型不安全 | 4/5 |
| C. 环境变量 + 验证 | 安全，易部署 | 需要额外代码 | 5/5 ✅ |

**最终决策**: 选择 C - 环境变量 + 配置类 + 验证

**理由**:
1. **12-factor app**: 遵循云原生最佳实践
2. **易于部署**: Docker, Kubernetes 友好
3. **类型安全**: TypeScript 配置类提供类型检查
4. **验证**: 启动时验证所有配置，快速失败
5. **默认值**: 合理的默认值降低配置负担

**实施细节**:
```typescript
export class TransportConfigManager {
  static load(): TransportConfig {
    // 加载环境变量
    const config = { ... };
    // 验证配置
    this.validate(config);
    return config;
  }
}
```

---

### 决策 5: 安全特性选择

**背景**: 需要确定必要的安全措施。

**安全特性对比**:

| 特性 | 必要性 | 实施成本 | 优先级 |
|------|--------|---------|--------|
| CORS | 高 | 低 | P0 ✅ |
| 速率限制 | 高 | 低 | P0 ✅ |
| API 密钥 | 中 | 低 | P1 ✅ |
| JWT 认证 | 低 | 中 | P2 |
| HTTPS | 高 | 低（反向代理） | P0 ✅ |
| 请求签名 | 低 | 高 | P3 |

**最终决策**: 实施 CORS + 速率限制 + API 密钥（可选）

**理由**:
1. **CORS**: 必须，支持浏览器客户端
2. **速率限制**: 必须，防止 API 滥用
3. **API 密钥**: 简单有效的基础认证
4. **HTTPS**: 通过反向代理实现（nginx/ALB）
5. **平衡**: 在安全性和复杂度之间取得平衡

**实施细节**:
```typescript
// CORS
app.use(cors({ origin: config.cors.origin }));

// 速率限制
app.use(rateLimit({ windowMs: 60000, max: 100 }));

// API 密钥（可选）
if (config.security.apiKey) {
  app.use('/mcp', apiKeyAuth);
}
```

---

### 决策 6: 错误处理策略

**背景**: 需要设计全面的错误处理机制。

**错误处理层次**:

| 层次 | 处理方式 | 目的 |
|------|---------|------|
| 1. Express 中间件 | 捕获路由错误 | 返回友好的错误响应 |
| 2. 异步函数 | try-catch | 防止未捕获的 Promise rejection |
| 3. 进程级 | uncaughtException | 最后的防线，记录并优雅关闭 |
| 4. 信号处理 | SIGINT, SIGTERM | 优雅关闭 |

**最终决策**: 多层错误处理 + 优雅关闭

**理由**:
1. **防御性**: 多层防护，never fail silently
2. **用户友好**: 返回标准的 JSON-RPC 错误响应
3. **可观测性**: 所有错误都被记录
4. **资源清理**: 确保资源正确释放
5. **生产就绪**: 避免进程意外退出

**实施细节**:
```typescript
// 1. Express 错误中间件
app.use((error, req, res, next) => {
  res.status(500).json({ jsonrpc: '2.0', error: { ... } });
});

// 2. 异步错误处理
async handleMCPRequest(req, res) {
  try {
    await this.transport.handleRequest(req, res, req.body);
  } catch (error) {
    // 处理错误
  }
}

// 3. 进程级错误处理
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  shutdown('UNCAUGHT_EXCEPTION');
});

// 4. 优雅关闭
async function shutdown(signal: string) {
  server.close();
  await midsceneManager.closeBrowser();
  if (httpServer) await httpServer.stop();
  process.exit(0);
}
```

---

### 决策 7: 日志策略

**背景**: MCP 服务器使用 stdio，需要避免干扰。

**选项对比**:

| 选项 | 优点 | 缺点 | 评分 |
|------|------|------|------|
| A. console.log | 简单 | 干扰 stdio 通信 | 1/5 |
| B. console.error | 不干扰 stdio | stderr 输出 | 5/5 ✅ |
| C. 日志库 | 功能丰富 | 增加依赖 | 3/5 |
| D. 文件日志 | 持久化 | 需要日志轮转 | 3/5 |

**最终决策**: 选择 B - console.error

**理由**:
1. **不干扰 stdio**: stderr 不会影响 stdin/stdout 通信
2. **简单**: 无需额外依赖
3. **符合规范**: MCP 规范推荐使用 stderr
4. **易于重定向**: 可以通过 shell 重定向到文件
5. **向后兼容**: 与现有代码风格一致

**日志格式**:
```typescript
console.error('🚀 Server started');
console.error('📊 Request: GET /health');
console.error('✅ Session created: abc-123');
console.error('❌ Error: Connection failed');
```

---

### 决策 8: HTTP 端点设计

**背景**: 需要设计 HTTP API 端点。

**端点设计**:

| 端点 | 方法 | 用途 | 优先级 |
|------|------|------|--------|
| `/mcp` | POST | MCP JSON-RPC | P0 ✅ |
| `/mcp` | GET | SSE 流 | P0 ✅ |
| `/health` | GET | 健康检查 | P0 ✅ |
| `/` | GET | 服务器信息 | P1 ✅ |
| `/sessions` | GET | 会话列表 | P1 ✅ |
| `/sessions/:id` | DELETE | 关闭会话 | P1 ✅ |
| `/metrics` | GET | Prometheus 指标 | P2 |

**最终决策**: 实施 P0 和 P1 端点

**理由**:
1. **MCP 协议**: `/mcp` 是核心端点
2. **健康检查**: 容器编排必需
3. **可观测性**: 服务器信息和会话管理帮助调试
4. **RESTful**: 遵循 REST 设计原则
5. **扩展性**: 预留 `/metrics` 等未来端点

**端点规范**:
```
POST /mcp          - MCP JSON-RPC 请求
GET  /mcp          - SSE 流式连接
GET  /health       - 健康检查
GET  /            - 服务器信息
GET  /sessions     - 会话列表
DELETE /sessions/:id - 关闭会话
```

---

### 决策 9: 会话超时策略

**背景**: 需要确定会话超时时间和清理策略。

**超时配置**:

| 参数 | 默认值 | 理由 |
|------|--------|------|
| Session TTL | 30 分钟 | 平衡资源使用和用户体验 |
| 清理间隔 | 1 分钟 | 及时清理，不过于频繁 |
| 最大会话 | 50 | 防止资源耗尽 |

**最终决策**: 30 分钟 TTL + 1 分钟清理间隔

**理由**:
1. **用户体验**: 30 分钟足够完成大多数操作
2. **资源管理**: 及时释放不活跃会话的资源
3. **可配置**: 通过环境变量可调整
4. **自动化**: 无需手动干预
5. **防止泄漏**: 确保资源不会无限增长

**实施细节**:
```typescript
private startCleanupTimer(): void {
  this.cleanupInterval = setInterval(() => {
    this.cleanupExpiredSessions();
  }, 60000); // 每分钟检查一次
  
  if (this.cleanupInterval.unref) {
    this.cleanupInterval.unref(); // 不阻塞进程退出
  }
}
```

---

### 决策 10: 启动脚本设计

**背景**: 需要提供易用的启动方式。

**选项对比**:

| 选项 | 优点 | 缺点 | 评分 |
|------|------|------|------|
| A. 直接 node 命令 | 简单 | 需要记住环境变量 | 2/5 |
| B. npm scripts | 集成到 package.json | 不够灵活 | 3/5 |
| C. Shell 脚本 | 灵活，易于定制 | 需要 Unix 环境 | 5/5 ✅ |
| D. CLI 工具 | 功能丰富 | 开发成本高 | 3/5 |

**最终决策**: 选择 C - Shell 脚本

**理由**:
1. **易用性**: 一键启动，无需记住复杂的环境变量
2. **灵活性**: 可以轻松定制配置
3. **文档化**: 脚本本身就是配置文档
4. **可移植**: 可以复制到其他环境
5. **调试友好**: 显示详细的启动信息

**脚本设计**:
- `start-http-server.sh`: HTTP 模式启动
- `start-stdio-server.sh`: stdio 模式启动
- 自动构建检查
- 详细的配置信息输出

---

## 📊 决策影响分析

### 对现有系统的影响

| 方面 | 影响程度 | 说明 |
|------|---------|------|
| 向后兼容 | ✅ 无影响 | 默认 stdio 模式 |
| 代码结构 | ⚠️ 小影响 | 新增 4 个文件，修改 1 个文件 |
| 依赖 | ⚠️ 小影响 | 新增 5 个依赖 |
| 性能 | ✅ 无影响 | stdio 模式性能不变 |
| 安全性 | ✅ 提升 | 新增安全特性 |

### 对未来扩展的影响

| 扩展方向 | 难度 | 说明 |
|---------|------|------|
| WebSocket | 低 | 传输路由器易于扩展 |
| gRPC | 中 | 需要新的传输实现 |
| Redis 会话 | 低 | SessionManager 接口清晰 |
| 多租户 | 中 | 需要添加租户隔离 |
| 负载均衡 | 低 | 无状态设计支持水平扩展 |

---

## 🎓 经验教训

### 成功经验

1. **详细的设计文档**: 提供了清晰的实施路径
2. **分层设计**: 每个组件职责单一，易于理解和测试
3. **配置驱动**: 环境变量配置提供了极大的灵活性
4. **向后兼容**: 保护了现有用户的投资

### 可改进之处

1. **测试**: 应该同步编写单元测试
2. **性能测试**: 需要验证并发性能指标
3. **文档**: 可以添加更多使用示例和故障排除指南
4. **监控**: 可以集成更完善的监控和告警系统

---

## 🔮 未来考虑

### 短期优化 (1-3 个月)
1. 添加单元测试和集成测试
2. 性能优化和压力测试
3. 完善文档和示例
4. 收集用户反馈

### 中期增强 (3-6 个月)
1. WebSocket 传输支持
2. Redis 会话存储
3. Prometheus 指标集成
4. 负载均衡支持

### 长期规划 (6-12 个月)
1. gRPC 高性能传输
2. 多租户支持
3. 云原生部署（Kubernetes Operator）
4. 插件架构

---

**决策审核**: 待审核  
**决策批准**: 待批准  
**实施状态**: ✅ 已完成

