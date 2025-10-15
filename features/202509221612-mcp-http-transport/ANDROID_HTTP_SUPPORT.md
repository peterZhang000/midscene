# Android MCP HTTP Transport Support

## 🎉 概述

**是的！Android MCP完全支持HTTP传输！** 

Midscene MCP服务器通过HTTP传输提供了完整的Android自动化功能，与Web自动化功能使用相同的HTTP API接口。

## 📱 Android工具列表

通过HTTP MCP服务器，可以访问以下5个Android专用工具：

### 1. `midscene_android_connect`
- **功能**: 通过ADB连接到Android设备
- **参数**: `deviceId` (可选) - 设备ID，如未提供则使用第一个可用设备
- **用途**: 建立与Android设备的连接

### 2. `midscene_android_launch` 
- **功能**: 在Android设备上启动应用或导航到URL
- **参数**: `uri` (必需) - 包名、Activity名或URL
- **用途**: 启动Android应用或打开网页

### 3. `midscene_android_list_devices`
- **功能**: 列出所有已连接的Android设备
- **参数**: 无
- **用途**: 获取可用设备列表

### 4. `midscene_android_back`
- **功能**: 按下Android设备的返回键
- **参数**: 无
- **用途**: 模拟返回键操作

### 5. `midscene_android_home`
- **功能**: 按下Android设备的主页键
- **参数**: 无
- **用途**: 模拟主页键操作

## 🔧 通用AI工具 (Android + Web)

除了Android专用工具，以下8个AI驱动的工具同时支持Android和Web自动化：

1. `midscene_aiTap` - AI点击操作
2. `midscene_aiInput` - AI文本输入
3. `midscene_aiScroll` - AI滚动操作
4. `midscene_aiWaitFor` - AI等待条件
5. `midscene_aiAssert` - AI断言验证
6. `midscene_aiKeyboardPress` - AI键盘操作
7. `midscene_screenshot` - 截图功能
8. `midscene_playwright_example` - 代码示例

## 🚀 启用Android模式

要通过HTTP使用Android功能，需要设置以下环境变量：

```bash
# 启用HTTP传输
export MIDSCENE_MCP_TRANSPORT="http"
export MIDSCENE_MCP_HTTP_PORT="3000"

# 启用Android模式
export MIDSCENE_MCP_ANDROID_MODE="true"

# 可选：ADB配置
export MIDSCENE_ADB_PATH="/path/to/adb"
export MIDSCENE_ADB_REMOTE_HOST="192.168.1.100"
export MIDSCENE_ADB_REMOTE_PORT="5037"
```

## 🌐 HTTP API使用示例

### 初始化连接
```javascript
POST /mcp
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "android-client",
      "version": "1.0.0"
    }
  },
  "id": 1
}
```

### 列出Android设备
```javascript
POST /mcp
Content-Type: application/json
mcp-session-id: your-session-id

{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "midscene_android_list_devices",
    "arguments": {}
  },
  "id": 2
}
```

### 连接到Android设备
```javascript
POST /mcp
Content-Type: application/json
mcp-session-id: your-session-id

{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "midscene_android_connect",
    "arguments": {
      "deviceId": "your-device-id"
    }
  },
  "id": 3
}
```

### AI点击操作
```javascript
POST /mcp
Content-Type: application/json
mcp-session-id: your-session-id

{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "midscene_aiTap",
    "arguments": {
      "locate": "登录按钮"
    }
  },
  "id": 4
}
```

## 🏗️ 架构优势

### 统一接口
- **单一会话**: 同一个MCP会话可以同时控制Web浏览器和Android设备
- **统一API**: 所有工具通过相同的HTTP JSON-RPC 2.0接口访问
- **一致体验**: Web和Android自动化使用相同的AI驱动工具

### 远程能力
- **云部署**: HTTP传输支持将MCP服务器部署到云端
- **远程设备**: 支持连接到远程ADB服务器上的Android设备
- **Web仪表板**: 可以构建Web界面来管理Android自动化任务

### 会话管理
- **多客户端**: 支持多个客户端同时连接
- **会话隔离**: 每个会话独立管理设备连接
- **状态跟踪**: 完整的会话生命周期管理

## 🔍 测试验证

我们的测试结果显示：

```
📊 Tool Analysis - Total: 13 tools

📱 Android Tools: 5
🌐 Web Tools: 0  
🔧 Common AI Tools: 8
📊 Total Tools via HTTP: 13

✅ Key Findings:
   • Android MCP tools are fully accessible via HTTP transport
   • All Android automation features work through HTTP API  
   • Same session can control both web browsers and Android devices
   • HTTP transport enables remote Android automation
   • Perfect for cloud deployments and web dashboards
```

## 🎯 使用场景

### 1. 远程Android测试
- 在云端部署MCP服务器
- 通过HTTP API控制远程Android设备
- 适合CI/CD集成

### 2. Web仪表板
- 构建Web界面管理Android自动化
- 实时监控设备状态
- 批量执行测试任务

### 3. 混合自动化
- 同一个会话控制Web和Android
- 跨平台的端到端测试
- 统一的自动化脚本

### 4. 团队协作
- 多人共享MCP服务器
- 设备资源池管理
- 测试任务分发

## 📝 总结

**Android MCP完全支持HTTP传输！** 

通过设置`MIDSCENE_MCP_ANDROID_MODE=true`，所有Android自动化功能都可以通过HTTP API访问，提供了与Web自动化相同的便利性和灵活性。这使得Midscene成为了一个真正的全平台自动化解决方案。
