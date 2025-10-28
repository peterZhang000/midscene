# Bridge Server 自动管理架构文档

## 📋 概述

BigTestAgent 现在支持根据用户注册的 Bridge 类型自动管理 Bridge Server 进程。该功能极大简化了 **local** 部署场景的使用流程。

## 🏗️ 三种 Bridge 部署模式

### 1. Local 模式（Backend 自动管理）

**适用场景**：Backend 和 Browser 在同一台机器上

```
┌─────────────────────────────────────────┐
│  同一台机器 (Localhost)                  │
│  ┌──────────────────────────────────┐  │
│  │  BigTestAgent Backend             │  │
│  │  ├─ ✅ 自动启动 Bridge Server     │  │
│  │  │   (port 3766)                  │  │
│  │  └─ MCP Client                    │  │
│  │     → ws://localhost:3766         │  │
│  └──────────────────────────────────┘  │
│            ↕ WebSocket                  │
│  ┌──────────────────────────────────┐  │
│  │  Chrome Extension                 │  │
│  │  └─ 连接 localhost:3766           │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**特点**：
- ✅ **Backend 自动启动** Bridge Server 进程
- ✅ **自动健康监控**和进程管理
- ✅ **自动重启**失败的进程
- ✅ **无需用户手动操作**

**用户操作**：
1. 在 Bridge 管理页面创建一个 `local` 类型的 Bridge
2. Backend 自动启动 Bridge Server
3. 打开 Chrome Extension，点击"启动 Bridge"
4. 完成！

---

### 2. VPN 模式（用户手动管理）

**适用场景**：Backend 和 Browser 在同一局域网/VPN 内

```
┌──────────────────────────────┐       ┌──────────────────────────────┐
│  机器 A (192.168.1.100)      │       │  机器 B (192.168.1.200)      │
│  ┌────────────────────────┐  │       │  ┌────────────────────────┐  │
│  │  BigTestAgent Backend   │  │       │  │  🔧 用户手动启动        │  │
│  │  └─ MCP Client          │  │       │  │  Bridge Server (3766)  │  │
│  │     → ws://192.168.1.  │──┼───────┼─>│                         │  │
│  │       200:3766          │  │       │  └────────────────────────┘  │
│  └────────────────────────┘  │       │            ↕                  │
│                               │       │  ┌────────────────────────┐  │
│                               │       │  │  Chrome Extension       │  │
│                               │       │  │  → localhost:3766       │  │
│                               │       │  └────────────────────────┘  │
└──────────────────────────────┘       └──────────────────────────────┘
```

**特点**：
- ❌ Backend **不启动** Bridge Server
- 🔧 **用户手动启动** Bridge Server
- ✅ Backend 仍然监控健康状态

**用户操作**：
1. 在用户本地机器（机器 B）启动 Bridge Server：
   ```bash
   cd /path/to/midscene
   node packages/web-integration/dist/bridge-server.js --port 3766
   ```
2. 在 Bridge 管理页面创建 `vpn` 类型的 Bridge，填写 `ws://192.168.1.200:3766`
3. 打开 Chrome Extension，点击"启动 Bridge"
4. 完成！

---

### 3. Remote 模式（用户手动管理 + 端口映射）

**适用场景**：Backend 在云端，Browser 在用户本地

```
┌──────────────────────────────┐       ┌──────────────────────────────┐
│  云端 (cloud.example.com)    │       │  用户本地 (Home)             │
│  ┌────────────────────────┐  │       │  ┌────────────────────────┐  │
│  │  BigTestAgent Backend   │  │       │  │  🔧 用户手动启动        │  │
│  │  └─ MCP Client          │  │       │  │  Bridge Server (3766)  │  │
│  │     → ws://user-home.  │──┼───────┼─>│  + ngrok/frp 暴露端口   │  │
│  │       ngrok.io:3766     │  │       │  └────────────────────────┘  │
│  └────────────────────────┘  │       │            ↕                  │
│                               │       │  ┌────────────────────────┐  │
│                               │       │  │  Chrome Extension       │  │
│                               │       │  │  → localhost:3766       │  │
│                               │       │  └────────────────────────┘  │
└──────────────────────────────┘       └──────────────────────────────┘
```

**特点**：
- ❌ Backend **不启动** Bridge Server
- 🔧 **用户手动启动** Bridge Server + 端口映射
- ✅ Backend 仍然监控健康状态

**用户操作**：
1. 在用户本地机器启动 Bridge Server：
   ```bash
   cd /path/to/midscene
   node packages/web-integration/dist/bridge-server.js --port 3766
   ```
2. 使用 ngrok/frp 暴露端口：
   ```bash
   ngrok http 3766
   # 或
   frpc -c frpc.ini
   ```
3. 在 Bridge 管理页面创建 `remote` 类型的 Bridge，填写公网 URL（如 `ws://abc123.ngrok.io:3766`）
4. 打开 Chrome Extension，点击"启动 Bridge"
5. 完成！

---

## 🔧 核心组件

### 1. BridgeServerManager

**位置**：`backend/services/bridge_server_manager.py`

**职责**：
- 管理 Bridge Server 进程的生命周期（仅 `local` 类型）
- 启动、停止、监控进程
- 检测端口冲突
- 自动清理僵尸进程

**关键方法**：
```python
# 启动 Bridge Server
process = await manager.start_bridge_server(
    bridge_config_id=1,
    port=3766
)

# 停止 Bridge Server
await manager.stop_bridge_server(bridge_config_id=1)

# 获取进程状态
process = manager.get_process(bridge_config_id=1)
```

### 2. UserBridgeService (扩展)

**位置**：`backend/services/user_bridge_service.py`

**新增功能**：
- 创建 `local` Bridge 时自动启动 Bridge Server
- 删除 `local` Bridge 时自动停止 Bridge Server
- 提供手动启动/停止接口

**关键方法**：
```python
service = UserBridgeService(db)

# 创建 Bridge（local 类型会自动启动 Server）
bridge = await service.create_bridge(user_id, bridge_data, auto_start=True)

# 手动启动 Bridge Server（仅 local 类型）
await service.start_bridge_server_manually(user_id, bridge_id)

# 手动停止 Bridge Server（仅 local 类型）
await service.stop_bridge_server_manually(user_id, bridge_id)

# 获取 Bridge Server 状态
status = service.get_bridge_server_status(user_id, bridge_id)
```

### 3. Bridge Management API (扩展)

**位置**：`backend/routers/bridges.py`

**新增端点**：

#### POST `/api/bridges/{bridge_id}/server/start`
手动启动 Bridge Server（仅 local 类型）

```bash
curl -X POST "http://localhost:8000/api/bridges/1/server/start?user_id=admin"
```

#### POST `/api/bridges/{bridge_id}/server/stop`
手动停止 Bridge Server（仅 local 类型）

```bash
curl -X POST "http://localhost:8000/api/bridges/1/server/stop?user_id=admin"
```

#### GET `/api/bridges/{bridge_id}/server/status`
获取 Bridge Server 进程状态

```bash
curl "http://localhost:8000/api/bridges/1/server/status?user_id=admin"
```

**响应示例**：
```json
{
  "bridge_type": "local",
  "managed": true,
  "running": true,
  "pid": 12345,
  "port": 3766,
  "started_at": "2025-10-28T10:30:00"
}
```

---

## 📊 使用流程对比

### Before（需要多步手动操作）
```
用户操作：
1. 手动启动 Bridge Server (node bridge-server.js --port 3766)
2. 在 Backend 注册 Bridge 配置
3. 手动启动 MCP Server
4. 打开 Chrome Extension
5. 点击"启动 Bridge"

问题：
❌ 步骤繁琐
❌ 容易出错
❌ 难以管理多个 Bridge
❌ 需要记住端口配置
```

### After（自动化管理）

#### Local 模式
```
用户操作：
1. 在 Bridge 管理页面创建 local Bridge
2. 打开 Chrome Extension，点击"启动 Bridge"
✅ 完成！Backend 自动处理所有 Server 进程管理

优点：
✅ 一键配置
✅ 自动启动/停止
✅ 自动健康监控
✅ 多 Bridge 并发管理
```

#### VPN/Remote 模式
```
用户操作：
1. 手动启动 Bridge Server（在用户本地机器）
2. 在 Bridge 管理页面创建 vpn/remote Bridge
3. 打开 Chrome Extension，点击"启动 Bridge"
✅ 完成！Backend 监控健康状态

优点：
✅ 灵活的部署架构
✅ 支持跨网络访问
✅ 统一的健康监控
```

---

## 🎯 最佳实践

### 选择正确的 Bridge 类型

| 场景 | 推荐类型 | 原因 |
|------|---------|------|
| 个人开发环境（Backend 和 Browser 同机） | `local` | 自动管理，零配置 |
| 团队内网环境（Backend 和 Browser 在同一局域网） | `vpn` | 灵活部署，共享 Backend |
| 云端 SaaS 部署（Backend 在云端，Browser 在用户本地） | `remote` | 支持公网访问 |

### 端口规划

```
推荐端口分配：
- Bridge Server 1: 3766 (默认)
- Bridge Server 2: 3767
- Bridge Server 3: 3768
...

避免与以下端口冲突：
- MCP Server: 3000
- BigTestAgent Backend: 8000
- 其他应用端口
```

### 多用户并发

每个用户可以注册多个 Bridge：
```
用户 A:
  - Bridge A1 (local, port 3766)  ← Backend 自动管理
  - Bridge A2 (local, port 3767)  ← Backend 自动管理

用户 B:
  - Bridge B1 (vpn, ws://192.168.1.200:3766)  ← 用户手动管理
  - Bridge B2 (remote, ws://ngrok.io:3766)    ← 用户手动管理
```

---

## 🔍 故障排查

### 问题 1: Bridge Server 启动失败

**错误信息**：`Port 3766 is already in use`

**解决方案**：
```bash
# 1. 查找占用端口的进程
lsof -i :3766

# 2. 停止冲突进程
kill -9 <PID>

# 3. 或者使用其他端口
# 在创建 Bridge 时选择其他端口号（如 3767）
```

### 问题 2: Bridge Server 进程意外退出

**排查步骤**：
1. 查看 Bridge Server 日志
2. 检查系统资源（内存、CPU）
3. 检查 Bridge 健康状态：
   ```bash
   curl "http://localhost:8000/api/bridges/1/server/status?user_id=admin"
   ```

### 问题 3: Chrome Extension 无法连接

**排查步骤**：
1. 确认 Bridge Server 正在运行
2. 确认端口配置正确
3. 检查防火墙设置
4. 查看 Chrome Extension DevTools Console

---

## 📚 相关文档

- [Multi-User Multi-Bridge Architecture](/features/202510271749-multi-user-multi-bridge-architecture/design.md)
- [Bridge Management API](/backend/routers/bridges.py)
- [Chrome Extension Port Configuration](/features/202510281350-chrome-extension-port-config/design.md)

---

## ✅ 总结

通过 Bridge Server 自动管理功能：

1. **Local 模式**：实现了真正的"零配置"体验
   - 创建 Bridge → Backend 自动启动 Server → 连接 Extension → 完成！
   
2. **VPN/Remote 模式**：保持了灵活性
   - 用户手动管理 Bridge Server
   - Backend 提供统一的健康监控
   
3. **统一管理**：所有类型的 Bridge 都通过同一套 API 管理
   - 健康监控
   - 使用统计
   - 并发控制

这种设计既满足了简单场景的易用性，又保留了复杂场景的灵活性！🎉

