# Packaging and Distribution Guide

这个文档说明如何将 `@midscene/bridge-server-standalone` 打包并分发给用户。

## 方案 1: 发布到 npm（推荐）

### 1. 构建包

```bash
cd packages/bridge-server-standalone
pnpm install
pnpm build
```

### 2. 发布到 npm

```bash
# 登录到 npm（如果还没登录）
npm login

# 发布包
npm publish --access public
```

### 3. 用户安装

用户可以通过以下方式安装：

```bash
# 全局安装
npm install -g @midscene/bridge-server-standalone

# 或使用 pnpm
pnpm add -g @midscene/bridge-server-standalone

# 或使用 yarn
yarn global add @midscene/bridge-server-standalone
```

### 4. 用户使用

```bash
# 直接运行
midscene-bridge

# 指定端口
midscene-bridge --port 3767
```

---

## 方案 2: 打包成 tarball 分发

如果不想发布到 npm，可以打包成 `.tgz` 文件分发。

### 1. 构建和打包

```bash
cd packages/bridge-server-standalone
pnpm install
pnpm build
npm pack
```

这会生成一个文件，例如：`midscene-bridge-server-standalone-0.1.0.tgz`

### 2. 分发给用户

将 `.tgz` 文件发送给用户。

### 3. 用户安装

```bash
# 从 tarball 安装
npm install -g /path/to/midscene-bridge-server-standalone-0.1.0.tgz

# 或从 URL 安装
npm install -g https://example.com/path/to/midscene-bridge-server-standalone-0.1.0.tgz
```

### 4. 用户使用

```bash
midscene-bridge
```

---

## 方案 3: 使用 npx（无需安装）

用户可以直接使用 npx 运行，无需安装：

```bash
# 如果已发布到 npm
npx @midscene/bridge-server-standalone

# 从 tarball 运行
npx /path/to/midscene-bridge-server-standalone-0.1.0.tgz
```

---

## 方案 4: 独立可执行文件（使用 pkg）

如果需要完全独立的可执行文件（不需要 Node.js），可以使用 `pkg`。

### 1. 安装 pkg

```bash
npm install -g pkg
```

### 2. 创建可执行文件

```bash
cd packages/bridge-server-standalone
pnpm build

# 为多个平台构建
pkg dist/cli.js \
  --targets node18-macos-x64,node18-linux-x64,node18-win-x64 \
  --output ../../dist/midscene-bridge
```

这会生成三个独立的可执行文件：
- `midscene-bridge-macos` (macOS)
- `midscene-bridge-linux` (Linux)
- `midscene-bridge-win.exe` (Windows)

### 3. 分发给用户

用户直接下载并运行对应平台的可执行文件，无需安装 Node.js。

---

## 依赖说明

这个包依赖以下 Midscene 内部包：
- `@midscene/core` - 核心工具函数
- `@midscene/shared` - 共享工具函数

以及外部依赖：
- `socket.io` - WebSocket 服务器
- `socket.io-client` - WebSocket 客户端

在发布前，需要确保：
1. `@midscene/core` 和 `@midscene/shared` 已发布到 npm
2. 或者将 `workspace:*` 依赖改为具体版本号

### 修改 package.json 依赖

如果要发布到 npm，需要将 `package.json` 中的依赖从：

```json
"dependencies": {
  "@midscene/core": "workspace:*",
  "@midscene/shared": "workspace:*",
  ...
}
```

改为具体版本：

```json
"dependencies": {
  "@midscene/core": "^0.30.2",
  "@midscene/shared": "^0.30.2",
  ...
}
```

---

## 版本管理

发布新版本时：

1. 更新 `package.json` 中的版本号
2. 更新 `CHANGELOG.md`（如果有）
3. 提交更改
4. 重新构建和发布

```bash
cd packages/bridge-server-standalone

# 更新版本（自动更新 package.json）
npm version patch  # 或 minor, major

# 重新构建
pnpm build

# 发布
npm publish --access public
```

---

## 测试发布

在正式发布前，可以先测试：

### 1. 本地链接测试

```bash
cd packages/bridge-server-standalone
pnpm build
npm link

# 在其他地方测试
midscene-bridge
```

### 2. 发布到 npm 测试环境

```bash
# 使用 npm 的 tag 功能发布测试版本
npm publish --tag beta --access public

# 用户安装测试版本
npm install -g @midscene/bridge-server-standalone@beta
```

---

## 故障排查

### 问题：找不到命令

确保 `bin/midscene-bridge` 文件有执行权限：

```bash
chmod +x bin/midscene-bridge
```

### 问题：依赖缺失

确保所有依赖都已正确安装：

```bash
pnpm install
```

### 问题：构建失败

检查 `@midscene/core` 和 `@midscene/shared` 是否已构建：

```bash
cd ../core && pnpm build
cd ../shared && pnpm build
```

---

## 推荐流程

1. **开发阶段**：使用 monorepo 的 `workspace:*` 依赖
2. **发布前**：
   - 更新版本号
   - 将依赖改为具体版本
   - 构建并测试
3. **发布**：发布到 npm
4. **用户使用**：`npm install -g @midscene/bridge-server-standalone`


