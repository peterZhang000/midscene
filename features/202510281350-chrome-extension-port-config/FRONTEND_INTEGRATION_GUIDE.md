# 前端 Bridge 管理集成指南

## 📋 概述

前端 Bridge 管理页面已完成，实现了以下功能：

1. **Bridge CRUD 管理**：创建、查看、编辑、删除 Bridge 配置
2. **Local 模式零配置**：创建 local Bridge 时，Backend 自动启动 Server
3. **Server 进程管理**：启动/停止 local Bridge 的 Server 进程
4. **管理脚本下载**：为 vpn/remote 模式提供手动管理脚本下载
5. **健康监控**：实时查看 Bridge 健康状态
6. **智能提示**：根据 Bridge 类型提供相应的操作指引

## 🎯 核心特性

### 1. 三种 Bridge 类型的差异化展示

| Bridge 类型 | 标识 | Server 管理 | 操作说明 |
|------------|------|------------|---------|
| **Local**  | 🗲 自动 | ✅ 自动启动/停止 | Backend 自动管理，无需手动操作 |
| **VPN**    | 🔗 手动 | ❌ 用户手动管理 | 需要下载脚本手动启动 Server |
| **Remote** | ☁ 手动 | ❌ 用户手动管理 | 需要下载脚本并配置端口映射 |

### 2. 创建 Bridge 的智能引导

```vue
<!-- 根据选择的 Bridge 类型显示不同的提示 -->
<template v-if="formData.bridge_type === 'local'">
  ✅ Backend 会自动启动和管理 Bridge Server，无需手动操作
</template>

<template v-else-if="formData.bridge_type === 'vpn'">
  ⚠️ 需要在本地机器手动启动 Bridge Server
</template>

<template v-else-if="formData.bridge_type === 'remote'">
  ⚠️ 需要手动启动 Bridge Server 并通过 ngrok/frp 暴露端口
</template>
```

### 3. Server 状态实时展示（Local 类型）

- **运行中**：显示绿色状态，提供"停止"按钮
- **已停止**：显示灰色状态，提供"启动"按钮
- **加载中**：按钮显示 loading 状态

### 4. 管理脚本一键下载

为 vpn/remote 模式提供三个管理脚本：

1. **start_bridge_server.sh** - 启动脚本
   ```bash
   ./start_bridge_server.sh [-p PORT] [-d]
   ```

2. **stop_bridge_server.sh** - 停止脚本
   ```bash
   ./stop_bridge_server.sh [-p PORT] [-a]
   ```

3. **check_bridge_server.sh** - 状态检查脚本
   ```bash
   ./check_bridge_server.sh [-p PORT]
   ```

## 🚀 使用流程

### 场景 1：Local 模式（推荐）

**适用对象**：个人开发者，Backend 和 Browser 在同一台机器

**操作步骤**：
1. 打开 Bridge 管理页面
2. 点击"创建 Bridge"
3. 填写配置：
   - Bridge 名称：`我的本地Bridge`
   - Bridge 类型：`Local（自动管理）`
   - 端口：`3766`（默认）
4. 点击"确定"
5. ✅ **完成！** Backend 自动启动 Bridge Server
6. 打开 Chrome Extension，点击"启动 Bridge"
7. 开始执行测试用例

**说明**：
- Local 模式的 Bridge URL 会自动生成：`ws://localhost:3766`
- Server 状态栏显示"运行中"，表示 Backend 已自动启动 Server
- 可以随时手动停止/启动 Server

---

### 场景 2：VPN 模式（团队协作）

**适用对象**：团队开发，Backend 在内网服务器，Browser 在开发者本地

**操作步骤**：

**在开发者本地机器上：**
1. 打开 Bridge 管理页面
2. 点击"下载管理脚本"
3. 下载 `start_bridge_server.sh`
4. 在终端执行：
   ```bash
   chmod +x start_bridge_server.sh
   ./start_bridge_server.sh -p 3766 -d
   ```
5. 看到提示：`✅ Bridge Server 已成功启动`

**在 Bridge 管理页面：**
1. 点击"创建 Bridge"
2. 填写配置：
   - Bridge 名称：`团队共享Bridge`
   - Bridge 类型：`VPN（手动管理）`
   - 端口：`3766`
   - Bridge URL：`ws://192.168.1.200:3766`（开发者本地机器 IP）
3. 点击"确定"

**在开发者本地机器上：**
1. 打开 Chrome Extension
2. 点击"启动 Bridge"
3. ✅ **完成！** 可以开始执行测试用例

**说明**：
- VPN 模式的 Server 状态栏显示"手动管理"
- Backend 不会启动 Server，但会监控健康状态
- 使用脚本可以方便地管理多个 Bridge Server

---

### 场景 3：Remote 模式（云端 SaaS）

**适用对象**：使用云端 Backend，Browser 在用户本地

**操作步骤**：

**在用户本地机器上：**
1. 下载管理脚本
2. 启动 Bridge Server：
   ```bash
   ./start_bridge_server.sh -p 3766 -d
   ```
3. 使用 ngrok 暴露端口：
   ```bash
   ngrok http 3766
   ```
4. 记下 ngrok URL：`https://abc123.ngrok.io`

**在 Bridge 管理页面：**
1. 点击"创建 Bridge"
2. 填写配置：
   - Bridge 名称：`远程Bridge`
   - Bridge 类型：`Remote（手动管理）`
   - 端口：`443`（ngrok 使用 443）
   - Bridge URL：`wss://abc123.ngrok.io`
3. 点击"确定"

**在用户本地机器上：**
1. 打开 Chrome Extension
2. 点击"启动 Bridge"
3. ✅ **完成！**

**说明**：
- Remote 模式需要暴露端口到公网
- 使用 `wss://` 而不是 `ws://`（ngrok 提供 HTTPS）
- 端口号为 443（ngrok 的 HTTPS 端口）

## 📊 页面功能详解

### 1. Bridge 列表

- **筛选器**：按 Bridge 类型、健康状态、是否启用筛选
- **实时状态**：健康状态、Server 运行状态（local 类型）
- **快速操作**：健康检查、编辑、删除

### 2. 创建/编辑对话框

**智能表单**：
- Bridge 类型选择后，自动显示相应的提示信息
- Local 类型的 URL 自动生成，不可编辑
- 端口号默认 3766，可自定义

**验证规则**：
- Bridge 名称：必填
- Bridge 类型：必填
- 端口：3000-9999 之间
- Bridge URL：必填（local 类型自动生成）

### 3. Server 进程管理（Local 类型）

**功能**：
- 实时显示 Server 运行状态
- 一键启动/停止 Server
- 加载状态反馈

**注意事项**：
- 仅 local 类型的 Bridge 显示此功能
- vpn/remote 类型显示"手动管理"标签

### 4. 管理脚本下载

**脚本列表**：
- 启动脚本（start_bridge_server.sh）
- 停止脚本（stop_bridge_server.sh）
- 状态检查脚本（check_bridge_server.sh）

**使用说明**：
- 下载后添加执行权限
- 支持多种命令行选项
- 适用于 Linux/macOS 系统

### 5. 健康监控

**功能**：
- 实时显示健康状态（健康/不健康/未知）
- 支持手动触发健康检查
- 显示健康检查错误信息

**状态说明**：
- **健康**：Bridge 正常连接
- **不健康**：连接失败或超时
- **未知**：尚未进行健康检查

## 🎨 UI 设计

### 颜色规范

```javascript
// Bridge 类型颜色
local: 'green'    // 绿色 - 自动管理
vpn: 'blue'       // 蓝色 - 局域网
remote: 'orange'  // 橙色 - 远程

// 健康状态颜色
healthy: 'success'    // 绿色
unhealthy: 'error'    // 红色
unknown: 'default'    // 灰色
```

### 图标使用

```javascript
// Bridge 类型图标
local: <ThunderboltOutlined />  // ⚡ 自动
vpn: <ApiOutlined />            // 🔗 局域网
remote: <CloudOutlined />       // ☁ 云端

// 操作图标
create: <PlusOutlined />
refresh: <ReloadOutlined />
download: <DownloadOutlined />
warning: <ExclamationCircleOutlined />
```

## 📝 API 接口

### Bridge CRUD

```javascript
// 获取列表
GET /api/bridges/?user_id=admin&page=1&page_size=20

// 创建
POST /api/bridges/?user_id=admin
Body: { bridge_name, bridge_type, bridge_url, ... }

// 更新
PUT /api/bridges/{bridge_id}?user_id=admin
Body: { bridge_name, is_default, ... }

// 删除
DELETE /api/bridges/{bridge_id}?user_id=admin
```

### Server 进程管理

```javascript
// 启动 Server
POST /api/bridges/{bridge_id}/server/start?user_id=admin

// 停止 Server
POST /api/bridges/{bridge_id}/server/stop?user_id=admin

// 获取状态
GET /api/bridges/{bridge_id}/server/status?user_id=admin
```

### 管理脚本

```javascript
// 获取脚本列表
GET /api/bridges/scripts/list

// 下载脚本
GET /api/bridges/scripts/download/{script_name}
```

## 🔍 常见问题

### Q1: 为什么创建 local Bridge 后，Server 状态显示"已停止"？

**A**: 可能原因：
1. 端口被占用
2. Midscene 未正确安装
3. Bridge Server 脚本不存在

**解决方案**：
1. 检查 Backend 日志
2. 手动尝试启动 Server
3. 查看 Bridge 健康状态的错误信息

### Q2: vpn/remote 模式下，脚本下载后无法执行？

**A**: 需要添加执行权限：
```bash
chmod +x *.sh
```

### Q3: 如何同时管理多个 Bridge？

**A**: 
- **Local 模式**：使用不同端口（3766, 3767, 3768...），Backend 自动管理
- **VPN/Remote 模式**：使用脚本启动多个 Server，指定不同端口

### Q4: Remote 模式的 URL 应该填什么？

**A**: 
- 如果使用 ngrok：`wss://your-subdomain.ngrok.io`
- 如果使用 frp：`ws://your-domain.com:port`
- 注意 https 对应 `wss://`，http 对应 `ws://`

## ✅ 总结

### 最佳实践

1. **个人开发**：优先使用 **Local 模式**，零配置，自动管理
2. **团队协作**：使用 **VPN 模式**，下载脚本手动管理
3. **云端 SaaS**：使用 **Remote 模式**，配置端口映射

### 核心优势

- ✅ **Local 模式零配置**：创建即启动，无需手动操作
- ✅ **智能引导**：根据 Bridge 类型提供相应的操作提示
- ✅ **脚本下载**：一键下载手动管理脚本
- ✅ **统一管理**：三种模式统一的管理界面
- ✅ **实时监控**：健康状态、Server 状态一目了然

### 下一步

1. 根据你的部署场景选择合适的 Bridge 类型
2. 创建 Bridge 配置
3. 打开 Chrome Extension，开始使用！

🎉 享受 Bridge 自动管理带来的便利吧！

