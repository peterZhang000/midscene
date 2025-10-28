# Bridge Server 自动管理 - 快速开始

## 🚀 5 分钟快速体验

### 方案 1：Local 模式（最简单）

适合：**Backend 和 Browser 在同一台机器**

```bash
# 1. 启动 Backend
cd /Users/peter/PycharmProjects/BigTestAgent/backend
python run.py

# 2. 启动前端
cd /Users/peter/PycharmProjects/BigTestAgent/frontend
npm run serve

# 3. 打开浏览器访问前端
# http://localhost:8080/system/bridges

# 4. 创建 Local Bridge
# - Bridge 名称: 我的本地Bridge
# - Bridge 类型: Local（自动管理）
# - 端口: 3766
# - 点击"确定"

# 5. ✅ 完成！Backend 自动启动了 Bridge Server
# 6. 查看 Server 状态栏，应该显示"运行中"
# 7. 打开 Chrome Extension，点击"启动 Bridge"
# 8. 可以开始执行测试用例了！
```

### 方案 2：VPN/Remote 模式（需要手动管理）

适合：**Backend 在服务器/云端，Browser 在本地**

```bash
# 1. 在前端下载管理脚本
# 访问: http://localhost:8080/system/bridges
# 点击"下载管理脚本" -> 下载所有三个脚本

# 2. 添加执行权限
chmod +x start_bridge_server.sh stop_bridge_server.sh check_bridge_server.sh

# 3. 配置 Midscene 路径（如果需要）
# 编辑 start_bridge_server.sh
# 修改: MIDSCENE_PATH="/path/to/your/midscene"

# 4. 启动 Bridge Server（后台运行）
./start_bridge_server.sh -p 3766 -d

# 5. 检查状态
./check_bridge_server.sh -p 3766

# 6. 在前端创建 VPN/Remote Bridge
# - Bridge 类型: VPN（手动管理）
# - Bridge URL: ws://localhost:3766  # 或远程 IP

# 7. 打开 Chrome Extension，点击"启动 Bridge"

# 8. 完成后停止 Server
./stop_bridge_server.sh -p 3766
```

---

## 📊 测试 API（可选）

### 测试 Bridge CRUD

```bash
# 1. 创建 Local Bridge
curl -X POST "http://localhost:8000/api/bridges/?user_id=admin" \
  -H "Content-Type: application/json" \
  -d '{
    "bridge_name": "测试Bridge",
    "bridge_type": "local",
    "bridge_url": "ws://localhost:3766",
    "bridge_port": 3766,
    "is_default": true,
    "max_concurrent": 1
  }'

# 2. 查看 Bridge 列表
curl "http://localhost:8000/api/bridges/?user_id=admin&page=1&page_size=20"

# 3. 查看 Server 状态（仅 local 类型）
curl "http://localhost:8000/api/bridges/1/server/status?user_id=admin"

# 4. 手动停止 Server
curl -X POST "http://localhost:8000/api/bridges/1/server/stop?user_id=admin"

# 5. 手动启动 Server
curl -X POST "http://localhost:8000/api/bridges/1/server/start?user_id=admin"

# 6. 健康检查
curl -X POST "http://localhost:8000/api/bridges/1/check-now"
```

### 测试脚本下载

```bash
# 1. 获取脚本列表
curl "http://localhost:8000/api/bridges/scripts/list"

# 2. 下载启动脚本
curl "http://localhost:8000/api/bridges/scripts/download/start_bridge_server.sh" \
  -o start_bridge_server.sh

# 3. 下载停止脚本
curl "http://localhost:8000/api/bridges/scripts/download/stop_bridge_server.sh" \
  -o stop_bridge_server.sh

# 4. 下载检查脚本
curl "http://localhost:8000/api/bridges/scripts/download/check_bridge_server.sh" \
  -o check_bridge_server.sh
```

---

## ✅ 验证清单

### Backend 验证

- [ ] Backend 正常启动（`python run.py`）
- [ ] API 可访问（`curl http://localhost:8000/api/bridges/scripts/list`）
- [ ] 日志正常输出（`backend/logs/bigtestagent.log`）

### Local 模式验证

- [ ] 创建 local Bridge 成功
- [ ] Backend 自动启动 Bridge Server
- [ ] 端口 3766 被监听（`lsof -i :3766`）
- [ ] Server 状态显示"运行中"
- [ ] 可以手动停止/启动 Server
- [ ] 删除 Bridge 时自动停止 Server

### VPN/Remote 模式验证

- [ ] 脚本下载成功
- [ ] 脚本可执行（`chmod +x *.sh`）
- [ ] 手动启动 Server 成功
- [ ] 状态检查脚本工作正常
- [ ] 手动停止 Server 成功

### 前端验证

- [ ] Bridge 管理页面正常加载
- [ ] 可以创建/编辑/删除 Bridge
- [ ] Bridge 类型标签正确显示
- [ ] Server 状态实时更新（local 类型）
- [ ] 脚本下载功能正常
- [ ] 健康检查功能正常

---

## 🐛 常见问题快速排查

### 1. Backend 启动失败

```bash
# 检查端口占用
lsof -i :8000

# 查看日志
tail -f backend/logs/bigtestagent.log
```

### 2. Bridge Server 启动失败

```bash
# 检查端口占用
lsof -i :3766

# 查看 Midscene 是否安装
ls -la /Users/peter/Documents/automation-test/midscene/packages/web-integration/dist/bridge-server.js

# 查看 Bridge 健康状态
curl "http://localhost:8000/api/bridges/1/server/status?user_id=admin"
```

### 3. 脚本执行失败

```bash
# 检查执行权限
ls -la *.sh

# 添加执行权限
chmod +x *.sh

# 查看脚本输出
./start_bridge_server.sh -p 3766  # 前台运行查看输出
```

### 4. 前端无法连接 Backend

```bash
# 检查 Backend 是否运行
curl http://localhost:8000/api/bridges/scripts/list

# 检查 CORS 配置
# 查看 backend/main.py 的 CORS 设置
```

---

## 📚 更多文档

- **架构文档**: [BRIDGE_SERVER_AUTO_MANAGEMENT.md](./BRIDGE_SERVER_AUTO_MANAGEMENT.md)
- **使用示例**: [USAGE_EXAMPLE.md](./USAGE_EXAMPLE.md)
- **前端集成**: [FRONTEND_INTEGRATION_GUIDE.md](./FRONTEND_INTEGRATION_GUIDE.md)

---

## 🎉 成功标志

当你看到以下情况时，说明一切正常：

1. ✅ Backend 日志输出：`✅ Started Bridge Server for 'xxx' (port=3766, pid=12345)`
2. ✅ 前端页面显示：Server 状态 = "运行中"
3. ✅ Chrome Extension 连接成功
4. ✅ 可以执行测试用例

恭喜！你已成功配置 Bridge Server 自动管理！🚀

