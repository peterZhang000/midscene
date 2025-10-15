# 🔧 Midscene MCP 双模式部署指南

## 🎯 架构说明

您的理解完全正确！**Android 和 Web 模式确实不能在同一个 MCP 服务器实例中同时使用**。

### 📋 架构限制原因：
1. **单一模式选择**: `MidsceneManager` 根据环境变量决定使用哪种模式
2. **互斥的工具注册**: 不同模式注册不同的工具集
3. **单一 Agent 实例**: 每个服务器只能持有一个 agent 实例

## 🚀 解决方案：双服务器部署

我们需要启动**两个独立的 MCP 服务器实例**，分别处理 Web 和 Android 自动化。

### 📁 启动脚本

#### 1. Web 专用服务器 (端口 3000)
```bash
./start-web-server.sh
```
- **端口**: 3000
- **模式**: Web 浏览器自动化
- **工具**: Web 导航、AI 交互、截图等

#### 2. Android 专用服务器 (端口 3001)
```bash
./start-android-server.sh
```
- **端口**: 3001  
- **模式**: Android 设备自动化
- **工具**: ADB 连接、应用启动、设备操作等

## 🔧 Cursor 配置

您的 `.cursor/mcp.json` 现在包含两个服务器：

```json
{
  "mcpServers": {
    "midscene-web": {
      "url": "http://localhost:3000/mcp",
      "env": {
        "OPENAI_BASE_URL": "http://47.236.39.80:11434/v1",
        "OPENAI_API_KEY": "ollama",
        "MIDSCENE_MODEL_NAME": "ui-tars-7b-dpo",
        "MIDSCENE_USE_VLM_UI_TARS": "1.0",
        "MIDSCENE_PROMPT_STYLE": "target-driven",
        "OPENAI_STREAM": "true"
      }
    },
    "midscene-android": {
      "url": "http://localhost:3001/mcp",
      "env": {
        "OPENAI_BASE_URL": "http://47.236.39.80:11434/v1",
        "OPENAI_API_KEY": "ollama",
        "MIDSCENE_MODEL_NAME": "ui-tars-7b-dpo",
        "MIDSCENE_USE_VLM_UI_TARS": "1.0",
        "MIDSCENE_PROMPT_STYLE": "target-driven",
        "OPENAI_STREAM": "true"
      }
    }
  }
}
```

## 🎯 使用方式

### Web 自动化任务
```
使用 midscene-web 打开 Google 并搜索 "midscene"
```

### Android 自动化任务  
```
使用 midscene-android 连接设备并启动微信应用
```

## 📊 服务器对比

| 特性 | midscene-web (3000) | midscene-android (3001) |
|------|-------------------|----------------------|
| **浏览器导航** | ✅ | ❌ |
| **Web AI 交互** | ✅ | ❌ |
| **Android 设备连接** | ❌ | ✅ |
| **应用启动** | ❌ | ✅ |
| **AI 通用工具** | ✅ | ✅ |
| **截图功能** | ✅ (Web) | ✅ (Android) |

## 🚀 启动流程

### 1. 启动 Web 服务器
```bash
cd /Users/peter/Documents/web3/react/midscene/packages/mcp
./start-web-server.sh
```

### 2. 启动 Android 服务器 (可选)
```bash
# 在新终端窗口中
cd /Users/peter/Documents/web3/react/midscene/packages/mcp  
./start-android-server.sh
```

### 3. 重启 Cursor
让新的 MCP 配置生效

### 4. 验证连接
在 Cursor 设置中检查两个服务器状态：
- `midscene-web` 应显示绿色
- `midscene-android` 应显示绿色（如果启动了）

## 🎯 测试 Google 搜索

现在您可以启动 Web 服务器并测试：

```bash
# 启动 Web 专用服务器
./start-web-server.sh
```

然后在 Cursor 中使用：
```
使用 midscene-web 打开 Google 并搜索 "midscene" 关键字
```

## 💡 优势

1. **清晰分离**: Web 和 Android 功能完全独立
2. **稳定性**: 一个模式的问题不会影响另一个
3. **灵活性**: 可以只启动需要的服务器
4. **资源优化**: 按需使用系统资源

## 🎉 总结

这种双服务器架构完美解决了模式冲突问题，让您可以：
- 🌐 **Web 自动化**: 使用 `midscene-web` (端口 3000)
- 📱 **Android 自动化**: 使用 `midscene-android` (端口 3001)  
- 🔄 **按需启动**: 只启动需要的服务器
- 🎯 **精确控制**: 明确指定使用哪个服务器
