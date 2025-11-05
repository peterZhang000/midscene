# Bridge Server Standalone - 项目总结

## 概述

这个包（`@midscene/bridge-server-standalone`）是一个独立的 Bridge Server，用于连接 Chrome Extension 和 MCP 客户端。

## 目录结构

```
bridge-server-standalone/
├── src/
│   ├── common.ts          # 公共常量和类型定义
│   ├── server.ts          # BridgeServer 主要实现
│   ├── index.ts           # 导出和 startBridgeServer 函数
│   └── cli.ts             # CLI 入口文件
├── bin/
│   └── midscene-bridge    # CLI 可执行文件
├── scripts/
│   ├── build-and-pack.sh  # 构建并打包脚本
│   └── test-local.sh      # 本地测试脚本
├── examples/
│   ├── programmatic-usage.js  # 编程式使用示例
│   ├── custom-server.js       # 自定义服务器示例
│   └── README.md              # 示例说明
├── package.json           # 包配置
├── rslib.config.ts        # 构建配置
├── tsconfig.json          # TypeScript 配置
├── README.md              # 用户文档
├── PACKAGING.md           # 打包和分发指南
├── QUICK_START.md         # 快速开始指南
└── SUMMARY.md             # 本文件
```

## 核心文件说明

### `src/server.ts`
- 包含 `BridgeServer` 类的完整实现
- 从 `packages/web-integration/src/bridge-mode/io-server.ts` 复制而来
- 支持多客户端连接（Chrome Extension + MCP Server）

### `src/common.ts`
- 定义了所有常量和类型
- 包括事件类型、端口号等

### `src/index.ts`
- 主入口文件
- 导出 `startBridgeServer` 便利函数
- 重新导出所有类型和类

### `src/cli.ts`
- CLI 工具入口
- 解析命令行参数
- 处理优雅关闭

## 依赖关系

### 内部依赖
- `@midscene/core` - 提供 `sleep` 等工具函数
- `@midscene/shared` - 提供 `logMsg` 等日志函数

### 外部依赖
- `socket.io` - WebSocket 服务器
- `socket.io-client` - WebSocket 客户端（用于 killRunningServer）

## 使用方式

### 1. 作为全局命令

```bash
npm install -g @midscene/bridge-server-standalone
midscene-bridge
```

### 2. 使用 npx

```bash
npx @midscene/bridge-server-standalone
```

### 3. 编程式使用

```javascript
const { startBridgeServer } = require('@midscene/bridge-server-standalone');
await startBridgeServer({ port: 3766 });
```

### 4. 自定义实例

```javascript
const { BridgeServer } = require('@midscene/bridge-server-standalone');
const server = new BridgeServer(3766);
await server.listen();
```

## 打包和分发

### 方式 1: npm 发布（推荐）

```bash
cd packages/bridge-server-standalone
pnpm install
pnpm build
npm publish --access public
```

### 方式 2: tarball 分发

```bash
cd packages/bridge-server-standalone
./scripts/build-and-pack.sh
# 生成 .tgz 文件，可以直接分发给用户
```

### 方式 3: 本地测试

```bash
cd packages/bridge-server-standalone
./scripts/test-local.sh
# 会 link 到全局，可以直接测试 midscene-bridge 命令
```

## 发布前准备

在发布到 npm 之前，需要：

1. **更新依赖版本**
   
   将 `package.json` 中的：
   ```json
   "@midscene/core": "workspace:*"
   ```
   改为：
   ```json
   "@midscene/core": "^0.30.2"
   ```

2. **确保依赖已发布**
   
   确保 `@midscene/core` 和 `@midscene/shared` 已发布到 npm。

3. **构建测试**
   
   ```bash
   pnpm build
   npm pack
   npm install -g ./midscene-bridge-server-standalone-0.1.0.tgz
   midscene-bridge --help
   ```

## 版本管理

使用语义化版本控制：

- **Patch** (0.1.0 → 0.1.1): Bug 修复
- **Minor** (0.1.0 → 0.2.0): 新功能，向后兼容
- **Major** (0.1.0 → 1.0.0): 破坏性更改

更新版本：

```bash
npm version patch  # 或 minor, major
npm publish --access public
```

## 特性

✅ **独立打包** - 不需要完整的 Midscene 项目
✅ **CLI 工具** - 提供 `midscene-bridge` 命令
✅ **编程接口** - 可以在代码中使用
✅ **多客户端支持** - 支持 Chrome Extension 和 MCP Server 同时连接
✅ **自动端口冲突处理** - 自动关闭冲突的服务器
✅ **TypeScript 支持** - 完整的类型定义
✅ **文档完善** - 包含多个文档和示例

## 与原脚本的区别

### 原脚本 (`bridge-server-standalone.cjs`)
- 需要手动找到 Midscene 安装路径
- 依赖项目内的文件
- 不易分发

### 新包 (`@midscene/bridge-server-standalone`)
- 独立的 npm 包
- 所有依赖都打包在内
- 易于安装和分发
- 提供完整的类型定义
- 支持编程式使用

## 后续维护

1. **同步更新**
   
   当 `packages/web-integration/src/bridge-mode/io-server.ts` 更新时，需要同步更新 `src/server.ts`。

2. **版本同步**
   
   建议与 Midscene 主版本保持同步。

3. **依赖更新**
   
   定期更新依赖包版本：
   ```bash
   pnpm update
   ```

## 测试清单

发布前测试：

- [ ] 构建成功：`pnpm build`
- [ ] 打包成功：`npm pack`
- [ ] CLI 可用：`npx ./midscene-bridge-server-standalone-0.1.0.tgz --help`
- [ ] 服务器启动：`npx ./midscene-bridge-server-standalone-0.1.0.tgz`
- [ ] Chrome 扩展连接成功
- [ ] MCP 客户端连接成功
- [ ] 编程式使用正常：运行 `examples/` 中的示例

## 常见问题

### Q: 为什么要创建独立包？

**A:** 原来的 `bridge-server-standalone.cjs` 脚本依赖项目内的文件，不易分发。独立包可以：
- 直接通过 npm 安装
- 无需完整的 Midscene 项目
- 提供更好的用户体验

### Q: 如何保持与主项目同步？

**A:** 当 `io-server.ts` 有重大更新时：
1. 复制更新到 `src/server.ts`
2. 更新版本号
3. 测试并发布新版本

### Q: 可以独立使用吗？

**A:** 是的，这个包可以完全独立使用。用户只需要：
- 安装这个包
- 安装 Chrome 扩展
- 运行 `midscene-bridge`

## 相关链接

- Midscene 主项目: https://github.com/web-infra-dev/midscene
- Midscene 文档: https://midscenejs.com/
- npm 包页面: https://www.npmjs.com/package/@midscene/bridge-server-standalone

## 贡献

欢迎贡献代码、报告问题或提出建议！

请访问主项目的 GitHub 仓库。


