# Bridge Server Examples

这里包含了使用 Bridge Server 的示例代码。

## 示例列表

### 1. `programmatic-usage.js`

展示如何在代码中使用 `startBridgeServer` 函数：

```bash
node examples/programmatic-usage.js
```

### 2. `custom-server.js`

展示如何直接使用 `BridgeServer` 类创建自定义服务器：

```bash
node examples/custom-server.js

# 使用自定义端口
PORT=3767 node examples/custom-server.js
```

## 运行示例

### 前提条件

1. 安装包：
   ```bash
   npm install -g @midscene/bridge-server-standalone
   ```

2. 或者从本地链接：
   ```bash
   cd packages/bridge-server-standalone
   npm link
   ```

### 测试连接

运行服务器后，你需要：

1. 安装 Midscene Chrome 扩展
2. 在扩展设置中配置服务器地址（例如：`ws://localhost:3766`）
3. 连接到服务器

## 集成到你的项目

### 安装

```bash
npm install @midscene/bridge-server-standalone
```

### 基本用法

```javascript
const { startBridgeServer } = require('@midscene/bridge-server-standalone');

async function main() {
  const server = await startBridgeServer({
    port: 3766,
    onConnect: () => console.log('Connected!'),
    onDisconnect: (reason) => console.log('Disconnected:', reason)
  });
  
  // Server is running...
}

main();
```

### TypeScript 用法

```typescript
import { startBridgeServer, BridgeServer } from '@midscene/bridge-server-standalone';

async function main() {
  const server: BridgeServer = await startBridgeServer({
    port: 3766,
  });
  
  // Server is running...
}

main();
```

## 高级用法

### 多端口服务器

```javascript
const { startBridgeServer } = require('@midscene/bridge-server-standalone');

async function startMultipleServers() {
  const server1 = await startBridgeServer({ port: 3766 });
  const server2 = await startBridgeServer({ port: 3767 });
  const server3 = await startBridgeServer({ port: 3768 });
  
  console.log('Multiple servers running on ports 3766, 3767, 3768');
}
```

### 集成到测试框架

```javascript
const { BridgeServer } = require('@midscene/bridge-server-standalone');

describe('My Tests', () => {
  let server;
  
  beforeAll(async () => {
    server = new BridgeServer(3766);
    await server.listen({ timeout: 10000 });
  });
  
  afterAll(async () => {
    await server.close();
  });
  
  test('should do something', async () => {
    // Your test code here
  });
});
```

## 故障排查

### 端口已被占用

如果遇到端口被占用的错误，可以：

1. 使用不同的端口：
   ```javascript
   startBridgeServer({ port: 3767 })
   ```

2. 自动关闭冲突的服务器：
   ```javascript
   startBridgeServer({ 
     port: 3766,
     closeConflictServer: true  // 默认已启用
   })
   ```

### 连接超时

如果 Chrome 扩展无法连接：

1. 确认服务器正在运行
2. 检查防火墙设置
3. 确认端口号正确
4. 检查扩展配置中的服务器地址


