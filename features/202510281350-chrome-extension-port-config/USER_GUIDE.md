# 📖 Chrome Extension Bridge Port Configuration - User Guide

**适用于**: Midscene Chrome Extension v0.30.2+  
**更新日期**: 2025-10-28

---

## 🎯 概述

Midscene Chrome Extension 现在支持自定义 Bridge 端口配置，允许您在同一台电脑上运行多个 Chrome Profile，每个 Profile 使用不同的端口，避免端口冲突。

---

## 🚀 快速开始

### 场景1：单个 Chrome Profile（默认使用）

**无需配置** - 默认使用端口 3766，与之前版本完全兼容。

### 场景2：多个 Chrome Profile 同时运行

**需要配置** - 每个 Profile 使用不同的端口（推荐：3766, 3767, 3768...）

---

## 📝 配置步骤

### 步骤1：打开 Extension

1. 点击 Chrome 工具栏中的 Midscene 图标
2. 选择 **"Bridge Mode"** 标签

### 步骤2：配置端口

您将看到 **"Bridge Port Configuration"** 区域：

```
┌─────────────────────────────────────────┐
│ ⚙️ Bridge Port Configuration            │
├─────────────────────────────────────────┤
│ Port: [3766]                   [Reset]  │
│                                          │
│ 💡 Tip: Use different ports for         │
│     multiple Chrome Profiles            │
└─────────────────────────────────────────┘
```

1. 点击端口输入框
2. 输入新端口号（范围：1024-65535）
3. 按 Enter 或点击输入框外部保存

### 步骤3：验证保存

您将看到绿色的确认消息：
```
✓ Port saved successfully
```

### 步骤4：启动 Bridge

点击 **"Allow Connection"** 按钮启动 Bridge。

您将看到：
```
● Active: 3767  (显示当前活动的端口)
```

---

## 👥 多 Profile 设置示例

### 员工A - 运行3个 Chrome Profile

#### Profile 1 (Default)
```
1. 打开 Chrome (Default Profile)
2. 安装 Midscene Extension
3. Bridge Mode → 配置端口: 3766
4. 启动 Bridge
```

#### Profile 2 (Test1)
```
1. 打开 Chrome (Profile: Test1)
   命令行: chrome --user-data-dir=/path/to/profile2
2. 安装 Midscene Extension
3. Bridge Mode → 配置端口: 3767
4. 启动 Bridge
```

#### Profile 3 (Test2)
```
1. 打开 Chrome (Profile: Test2)
   命令行: chrome --user-data-dir=/path/to/profile3
2. 安装 Midscene Extension
3. Bridge Mode → 配置端口: 3768
4. 启动 Bridge
```

现在，3个 Bridge 同时运行在不同端口上，互不冲突！

---

## 🔧 在 BigTestAgent 中注册 Bridge

配置完成后，在 BigTestAgent 平台注册您的 Bridge：

```bash
curl -X POST http://bigtestagent/api/user-bridges/register-batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "bridges": [
      {
        "bridge_name": "profile1",
        "bridge_url": "ws://192.168.1.50:3766",
        "chrome_profile": "Default",
        "is_default": true
      },
      {
        "bridge_name": "profile2",
        "bridge_url": "ws://192.168.1.50:3767",
        "chrome_profile": "Test1"
      },
      {
        "bridge_name": "profile3",
        "bridge_url": "ws://192.168.1.50:3768",
        "chrome_profile": "Test2"
      }
    ]
  }'
```

**重要**：`bridge_url` 中的端口必须与 Extension 配置的端口一致！

---

## ⚠️ 注意事项

### 1. 端口冲突

**症状**: Bridge 无法启动，显示错误：
```
❌ Port 3766 is already in use. Try: 3767, 3768, 3769
```

**原因**: 该端口已被另一个 Profile 的 Bridge 占用

**解决方案**:
- 使用建议的可用端口（3767, 3768, 3769）
- 或者停止占用该端口的 Bridge

### 2. 运行时无法修改端口

**症状**: 端口输入框变灰，无法点击

**原因**: Bridge 正在运行中

**解决方案**:
1. 点击 **"Stop"** 按钮停止 Bridge
2. 修改端口
3. 重新启动 Bridge

### 3. 端口验证失败

**症状**: 显示红色错误消息：
```
Port must be between 1024 and 65535
```

**原因**: 输入的端口号不在有效范围内

**解决方案**:
- 使用 1024-65535 之间的端口
- 推荐使用 3766-3800 范围
- 避免使用常用端口（如 3000, 8080, 8000）

---

## 🔍 故障排查

### 问题：配置不持久化

**症状**: 重启浏览器后端口重置为 3766

**检查**:
1. 是否在隐身模式下使用？（隐身模式不保存配置）
2. 浏览器是否清除了 localStorage？

**解决**:
- 使用正常窗口（非隐身）
- 检查 Chrome 设置 → 隐私和安全 → 清除浏览数据

### 问题：找不到配置界面

**症状**: Bridge Mode 中没有看到端口配置区域

**检查**:
1. Extension 版本是否 >= 0.30.2？
2. Extension 是否正确加载？

**解决**:
1. 检查 Extension 版本：`chrome://extensions/`
2. 如果版本过旧，重新构建并安装 Extension

### 问题：Bridge 连接失败

**症状**: Bridge 一直显示 "Listening..."，不变为 "Connected"

**检查**:
1. 端口是否被防火墙阻止？
2. 端口是否已被其他程序占用？

**解决**:
1. 检查端口占用：
   ```bash
   # macOS/Linux
   lsof -i :3766
   
   # Windows
   netstat -ano | findstr :3766
   ```
2. 检查防火墙设置，允许该端口

---

## 💡 最佳实践

### 端口分配建议

**规则**: 使用连续端口，便于管理

| Profile | 用途 | 推荐端口 |
|---------|------|----------|
| Default | 生产环境 | 3766 |
| Test1 | 测试环境 | 3767 |
| Test2 | 开发环境 | 3768 |
| Test3 | 预发环境 | 3769 |

### 端口规划表

在团队中使用时，建议维护端口规划表：

```markdown
| 员工 | 电脑IP | Profile | 端口 |
|------|--------|---------|------|
| 员工A | 192.168.1.50 | Default | 3766 |
| 员工A | 192.168.1.50 | Test1 | 3767 |
| 员工A | 192.168.1.50 | Test2 | 3768 |
| 员工B | 192.168.1.51 | Default | 3766 |
| 员工C | 192.168.1.52 | Default | 3766 |
| 员工C | 192.168.1.52 | Test1 | 3767 |
```

**注意**: 不同电脑可以使用相同端口（端口是本地的），同一台电脑必须使用不同端口。

---

## 📊 配置检查清单

在启动 Bridge 前，确保：

- [ ] 端口已配置并保存（显示 "✓ Port saved successfully"）
- [ ] 端口在有效范围内（1024-65535）
- [ ] 该端口在本机未被占用
- [ ] 如有多个 Profile，每个 Profile 使用不同端口
- [ ] 在 BigTestAgent 中注册的 `bridge_url` 端口与 Extension 配置一致

---

## 📞 获取帮助

如果遇到问题：

1. **查看日志**: 打开 Chrome DevTools (F12) → Console 标签
2. **检查配置**: 查看 localStorage (`chrome://extensions/` → 详情 → 检查视图)
3. **联系支持**: 提供以下信息：
   - Extension 版本
   - Chrome 版本
   - 配置的端口
   - 控制台日志
   - 错误截图

---

## 🎓 相关文档

- **技术设计文档**: `design.md`
- **实施报告**: `IMPLEMENTATION_COMPLETE.md`
- **测试指南**: `TESTING_GUIDE.md`
- **BigTestAgent 架构**: `../202510271749-multi-user-multi-bridge-architecture/design.md`

---

*最后更新: 2025-10-28*  
*文档版本: 1.0*  
*适用版本: Midscene Extension v0.30.2+*

