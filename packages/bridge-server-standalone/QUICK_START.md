# Quick Start Guide

快速开始使用 Midscene Bridge Server。

## 安装

### 方式 1: 从 npm 安装（推荐）

```bash
npm install -g @midscene/bridge-server-standalone
```

### 方式 2: 从 tarball 安装

如果你收到了一个 `.tgz` 文件：

```bash
npm install -g /path/to/midscene-bridge-server-standalone-0.1.0.tgz
```

### 方式 3: 使用 npx（无需安装）

```bash
npx @midscene/bridge-server-standalone
```

## 使用

### 启动服务器

```bash
# 使用默认端口 (3766)
midscene-bridge

# 使用自定义端口
midscene-bridge --port 3767

# 查看帮助
midscene-bridge --help
```

### 连接 Chrome 扩展

1. 启动 Bridge Server
2. 打开 Midscene Chrome 扩展
3. 在扩展设置中输入服务器地址：`ws://localhost:3766`
4. 点击"连接"

### 停止服务器

按 `Ctrl+C` 停止服务器。

## 在代码中使用

### 安装为项目依赖

```bash
npm install @midscene/bridge-server-standalone
```

### JavaScript

```javascript
const { startBridgeServer } = require('@midscene/bridge-server-standalone');

async function main() {
  const server = await startBridgeServer({
    port: 3766,
    onConnect: () => console.log('✅ Connected!'),
    onDisconnect: (reason) => console.log('❌ Disconnected:', reason)
  });
}

main();
```

### TypeScript

```typescript
import { startBridgeServer } from '@midscene/bridge-server-standalone';

async function main() {
  const server = await startBridgeServer({
    port: 3766,
  });
}

main();
```

## 常见问题

### Q: 端口已被占用怎么办？

**A:** 使用不同的端口：

```bash
midscene-bridge --port 3767
```

或者，Bridge Server 会自动尝试关闭冲突的服务器（默认行为）。

### Q: Chrome 扩展连接不上？

**A:** 检查以下几点：
1. 确认 Bridge Server 正在运行
2. 检查端口号是否正确（默认 3766）
3. 确认防火墙没有阻止连接
4. 确认扩展中配置的服务器地址正确

### Q: 如何在多台机器上使用？

**A:** 如果需要从其他机器连接：

1. Bridge Server 默认监听 `0.0.0.0`，可以从局域网访问
2. 确认防火墙允许该端口的入站连接
3. 在 Chrome 扩展中使用服务器 IP 地址：`ws://192.168.1.100:3766`

### Q: 如何卸载？

**A:** 

```bash
npm uninstall -g @midscene/bridge-server-standalone
```

## 架构说明

```
┌─────────────────┐
│   MCP Client    │
│  (Cursor/Claude)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐         ┌──────────────────┐
│  Bridge Server  │ ◄─────► │ Chrome Extension │
│   (This Tool)   │         │   (Browser)      │
└─────────────────┘         └──────────────────┘
```

Bridge Server 充当中间件，连接：
- **MCP Client**（如 Cursor AI）- 发送自动化命令
- **Chrome Extension** - 在浏览器中执行命令

## 更多信息

- 完整文档: [README.md](./README.md)
- 示例代码: [examples/](./examples/)
- 打包指南: [PACKAGING.md](./PACKAGING.md)

## 支持

如有问题，请访问：
- GitHub Issues: https://github.com/web-infra-dev/midscene/issues
- 文档: https://midscenejs.com/


