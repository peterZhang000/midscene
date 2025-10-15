# MCP HTTP Transport 实施计划

**创建时间**: 2025-10-15 17:21  
**需求来源**: 设计文档 features/202509221612-mcp-http-transport/

## 📋 需求概述

为 Midscene MCP 项目实现 HTTP Transport 支持，在保持 stdio 传输向后兼容的基础上，添加基于 HTTP 的传输模式，支持多客户端并发连接。

## 🎯 核心目标

1. **双传输模式架构**: stdio (默认) + HTTP (可选)
2. **会话管理**: 支持多客户端并发，独立会话隔离
3. **HTTP 服务器**: 基于 Express.js + MCP SDK StreamableHTTPServerTransport
4. **配置管理**: 环境变量驱动的灵活配置
5. **安全特性**: CORS、速率限制、API 密钥认证
6. **监控端点**: 健康检查、会话管理、服务器信息

## 🏗️ 技术架构

### 组件结构
```
packages/mcp/src/
├── config/
│   └── transport-config.ts      # 配置管理器
├── transport/
│   ├── router.ts                # 传输路由器
│   ├── http-server.ts           # HTTP 服务器包装器
│   └── session-manager.ts       # 会话管理器
└── index.ts                     # 主入口 (需更新)
```

### 依赖添加
- `express`: ^4.18.2 - HTTP 服务器框架
- `cors`: ^2.8.5 - CORS 中间件
- `express-rate-limit`: ^7.1.5 - 速率限制
- `@types/express`: ^4.17.21 - TypeScript 类型
- `@types/cors`: ^2.8.17 - TypeScript 类型

## 📝 实施步骤

### 阶段 1: 基础设施准备
- [x] 创建项目文档目录
- [ ] 更新 package.json 添加依赖
- [ ] 创建目录结构 (config/, transport/)

### 阶段 2: 核心组件实现
- [ ] **配置管理器** (`src/config/transport-config.ts`)
  - 环境变量加载与验证
  - 默认值设置
  - 配置类型定义
  
- [ ] **会话管理器** (`src/transport/session-manager.ts`)
  - 会话创建、更新、删除
  - 自动超时清理
  - 并发限制控制
  
- [ ] **HTTP 服务器** (`src/transport/http-server.ts`)
  - Express.js 服务器设置
  - StreamableHTTPServerTransport 集成
  - 中间件配置 (CORS, 速率限制, 解析)
  - 路由实现 (/mcp, /health, /sessions)
  
- [ ] **传输路由器** (`src/transport/router.ts`)
  - stdio/http/auto 模式选择
  - 自动检测逻辑
  - 传输实例创建

### 阶段 3: 集成与更新
- [ ] **更新主入口** (`src/index.ts`)
  - 使用 TransportRouter 替换硬编码 StdioServerTransport
  - 根据传输模式启动相应服务器
  - 优雅关闭处理

### 阶段 4: 工具与文档
- [ ] 创建启动脚本
  - `start-http-server.sh` - HTTP 模式启动
  - `start-stdio-server.sh` - stdio 模式启动
- [ ] 编写完成总结文档

## 🔧 环境变量配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MIDSCENE_MCP_TRANSPORT` | `stdio` | 传输模式: stdio/http/auto |
| `MIDSCENE_MCP_HTTP_PORT` | `3000` | HTTP 端口 |
| `MIDSCENE_MCP_HTTP_HOST` | `0.0.0.0` | 绑定地址 |
| `MIDSCENE_MCP_CORS_ORIGIN` | `*` | CORS 源 |
| `MIDSCENE_MCP_CORS_CREDENTIALS` | `false` | CORS 凭证 |
| `MIDSCENE_MCP_SESSION_TTL` | `1800000` | 会话超时 (30分钟) |
| `MIDSCENE_MCP_MAX_SESSIONS` | `50` | 最大并发会话 |
| `MIDSCENE_MCP_RATE_WINDOW` | `60000` | 速率窗口 (1分钟) |
| `MIDSCENE_MCP_RATE_MAX` | `100` | 窗口最大请求 |
| `MIDSCENE_MCP_API_KEY` | - | API 密钥 (可选) |

## 🎯 HTTP 端点

- `POST /mcp` - 主 MCP JSON-RPC 端点
- `GET /mcp` - SSE 流式连接
- `GET /health` - 健康检查
- `GET /` - 服务器信息
- `GET /sessions` - 活动会话列表
- `DELETE /sessions/:id` - 关闭特定会话

## ✅ 设计原则

1. **零破坏性变更**: 默认 stdio 模式，现有客户端无需修改
2. **最小侵入性**: 新增文件为主，现有代码改动最小
3. **安全优先**: CORS、速率限制、输入验证
4. **可观测性**: 日志、健康检查、会话监控
5. **生产就绪**: 优雅关闭、错误处理、资源清理

## 📊 预期成果

1. 完全向后兼容的双传输模式架构
2. 支持 50+ 并发会话
3. 完整的 HTTP API 端点
4. 生产级安全特性
5. 详细的监控和日志

## 🔍 验证方法

1. **功能测试**: 
   - stdio 模式正常工作
   - HTTP 模式正常工作
   - 多客户端并发测试

2. **安全测试**:
   - CORS 配置验证
   - 速率限制验证
   - API 密钥认证验证

3. **性能测试**:
   - 并发会话压力测试
   - 响应延迟测试
   - 资源使用监控

## 📚 参考文档

- `features/202509221612-mcp-http-transport/design.md` - 完整技术规范
- `features/202509221612-mcp-http-transport/HTTP_TRANSPORT.md` - 使用指南
- MCP SDK 文档: https://github.com/modelcontextprotocol/sdk

