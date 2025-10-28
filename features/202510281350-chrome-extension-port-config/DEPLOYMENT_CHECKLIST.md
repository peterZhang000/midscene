# Bridge Server 部署检查清单

## ✅ 部署前检查

### 1. 文件完整性

确认以下文件存在：

```bash
# Backend 文件
backend/services/bridge_server_manager.py        # Bridge Server 进程管理器
backend/services/user_bridge_service.py          # Bridge 服务层
backend/routers/bridges.py                        # Bridge API 端点

# 脚本文件
scripts/bridge-server-standalone.cjs             # Bridge Server 启动脚本 ✅
scripts/start_bridge_server.sh                   # 手动启动脚本
scripts/stop_bridge_server.sh                    # 手动停止脚本
scripts/check_bridge_server.sh                   # 状态检查脚本

# 前端文件
frontend/src/views/bridges/BridgeManagement.vue  # Bridge 管理页面
frontend/src/api/bridges.js                      # Bridge API 服务
```

### 2. 环境检查

```bash
# Node.js（必需）
node --version   # >= v14.0.0

# Python（必需）
python --version  # >= 3.8

# 数据库（必需）
mysql --version   # >= 5.7 或 MariaDB >= 10.2
```

---

## 🚀 部署步骤

### 方案 A：标准部署（推荐）

**适用**：生产环境、Docker、云服务器

#### 1. 克隆/更新代码

```bash
cd /opt/BigTestAgent
git pull origin main
```

#### 2. 检查脚本文件

```bash
# 确认 bridge-server-standalone.cjs 存在
ls -lh scripts/bridge-server-standalone.cjs

# 如果不存在，从 Midscene 复制
cp /path/to/midscene/packages/web-integration/bridge-server-standalone.js \
   scripts/bridge-server-standalone.cjs
```

#### 3. 安装依赖

```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
npm run build
```

#### 4. 数据库迁移

```bash
cd backend
python -c "
from database.session import SessionLocal
from database.models import Base, UserBridgeConfig
from sqlalchemy import text

db = SessionLocal()
try:
    # 检查表是否存在
    result = db.execute(text('SHOW TABLES LIKE \"user_bridge_configs\"'))
    if not result.fetchone():
        print('运行数据库迁移...')
        # 运行迁移脚本
        exec(open('database/migrations/run_multi_bridge_migration.py').read())
    else:
        print('✓ Bridge 表已存在')
finally:
    db.close()
"
```

#### 5. 启动服务

```bash
# 启动 Backend
cd backend
python run.py

# 或使用 systemd
systemctl restart bigtestagent
```

#### 6. 验证部署

```bash
# 检查 Backend 日志
tail -f backend/logs/bigtestagent.log

# 应该看到：
# "Found Bridge Server script at: /opt/BigTestAgent/scripts/bridge-server-standalone.cjs"

# 测试 API
curl http://localhost:8000/api/bridges/scripts/list

# 访问前端
open http://localhost:8080/system/bridges
```

---

### 方案 B：Docker 部署

#### Dockerfile

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# 安装 Node.js（Bridge Server 需要）
RUN apt-get update && \
    apt-get install -y nodejs npm && \
    rm -rf /var/lib/apt/lists/*

# 复制项目文件
COPY backend/ /app/backend/
COPY scripts/ /app/scripts/

# 安装 Python 依赖
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# 暴露端口
EXPOSE 8000 3766-3770

# 启动命令
CMD ["python", "/app/backend/run.py"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  bigtestagent:
    build: .
    ports:
      - "8000:8000"
      - "3766-3770:3766-3770"  # Bridge Server 端口范围
    environment:
      - DATABASE_URL=mysql://user:pass@db:3306/bigtestagent
      # 可选：指定自定义 Bridge Server 脚本路径
      # - MIDSCENE_BRIDGE_SERVER_PATH=/app/scripts/bridge-server-standalone.cjs
    volumes:
      - ./backend/logs:/app/backend/logs
    depends_on:
      - db
  
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: bigtestagent
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

#### 构建和运行

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f bigtestagent

# 验证
curl http://localhost:8000/api/bridges/scripts/list
```

---

### 方案 C：自定义路径部署

**适用**：特殊环境、多版本共存

#### 1. 复制脚本到自定义位置

```bash
sudo mkdir -p /opt/midscene
sudo cp scripts/bridge-server-standalone.cjs /opt/midscene/
sudo chmod +x /opt/midscene/bridge-server-standalone.cjs
```

#### 2. 设置环境变量

**选项 A：全局环境变量**
```bash
# 编辑 /etc/environment
sudo nano /etc/environment

# 添加
MIDSCENE_BRIDGE_SERVER_PATH=/opt/midscene/bridge-server-standalone.cjs
```

**选项 B：Systemd Service**
```bash
sudo nano /etc/systemd/system/bigtestagent.service

# 添加
Environment="MIDSCENE_BRIDGE_SERVER_PATH=/opt/midscene/bridge-server-standalone.cjs"

sudo systemctl daemon-reload
sudo systemctl restart bigtestagent
```

**选项 C：启动脚本**
```bash
# start.sh
export MIDSCENE_BRIDGE_SERVER_PATH=/opt/midscene/bridge-server-standalone.cjs
python backend/run.py
```

---

## 🔍 验证清单

### Backend 验证

- [ ] Backend 成功启动
- [ ] 日志显示找到 Bridge Server 脚本
  ```
  INFO - Found Bridge Server script at: ...
  ```
- [ ] API 可访问
  ```bash
  curl http://localhost:8000/api/bridges/scripts/list
  ```
- [ ] 数据库表已创建
  ```sql
  SHOW TABLES LIKE 'user_bridge_configs';
  ```

### 前端验证

- [ ] 前端页面可访问
- [ ] Bridge 管理页面正常加载
- [ ] 创建 local Bridge 成功
- [ ] Server 状态正确显示

### Bridge Server 验证

- [ ] 脚本可手动执行
  ```bash
  node scripts/bridge-server-standalone.cjs --help
  ```
- [ ] local Bridge 的 Server 可自动启动
  ```bash
  curl -X POST "http://localhost:8000/api/bridges/1/server/start?user_id=admin"
  ```
- [ ] 端口正确监听
  ```bash
  lsof -i :3766
  ```

---

## 🐛 故障排查

### 问题 1：找不到 Bridge Server 脚本

**症状**：
```
ERROR - Bridge Server script not found
```

**解决**：
```bash
# 方案 1：复制到项目 scripts 目录
cp /path/to/bridge-server-standalone.cjs scripts/

# 方案 2：设置环境变量
export MIDSCENE_BRIDGE_SERVER_PATH=/path/to/bridge-server-standalone.cjs

# 方案 3：复制到标准位置
cp scripts/bridge-server-standalone.cjs ~/.midscene/
```

### 问题 2：脚本无法执行

**症状**：
```
Permission denied
```

**解决**：
```bash
chmod +x scripts/bridge-server-standalone.cjs
chmod +x scripts/*.sh
```

### 问题 3：端口被占用

**症状**：
```
ERROR - Port 3766 is already in use
```

**解决**：
```bash
# 查找占用进程
lsof -i :3766

# 停止进程
kill -9 <PID>

# 或使用其他端口
curl -X POST "http://localhost:8000/api/bridges/1/server/start?user_id=admin" \
  -H "Content-Type: application/json" \
  -d '{"bridge_port": 3767}'
```

### 问题 4：Node.js 未安装

**症状**：
```
node: command not found
```

**解决**：
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm

# CentOS/RHEL
sudo yum install nodejs npm

# macOS
brew install node

# 验证
node --version
```

---

## 📝 配置文件模板

### Systemd Service

```ini
[Unit]
Description=BigTestAgent Service
After=network.target mysql.service

[Service]
Type=simple
User=bigtestagent
Group=bigtestagent
WorkingDirectory=/opt/BigTestAgent/backend

# 环境变量（可选）
Environment="MIDSCENE_BRIDGE_SERVER_PATH=/opt/BigTestAgent/scripts/bridge-server-standalone.cjs"
Environment="DATABASE_URL=mysql://user:pass@localhost:3306/bigtestagent"

# 启动命令
ExecStart=/opt/BigTestAgent/venv/bin/python run.py

# 重启策略
Restart=always
RestartSec=10

# 日志
StandardOutput=append:/var/log/bigtestagent/stdout.log
StandardError=append:/var/log/bigtestagent/stderr.log

[Install]
WantedBy=multi-user.target
```

### Nginx 反向代理

```nginx
upstream bigtestagent_backend {
    server localhost:8000;
}

server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /opt/BigTestAgent/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://bigtestagent_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket 支持（Bridge Server）
    location /bridge/ {
        proxy_pass http://localhost:3766;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## ✅ 部署后检查

### 1. 系统状态

```bash
# 检查服务状态
systemctl status bigtestagent

# 检查进程
ps aux | grep "python.*run.py"

# 检查端口
netstat -tulpn | grep -E "8000|3766"
```

### 2. 日志检查

```bash
# Backend 日志
tail -f /opt/BigTestAgent/backend/logs/bigtestagent.log

# 系统日志
journalctl -u bigtestagent -f

# Bridge Server 日志
tail -f ~/.bigtestagent/bridge-logs/bridge-3766.log
```

### 3. 功能测试

```bash
# 测试 API
curl http://localhost:8000/api/bridges/scripts/list

# 测试 Bridge 创建
curl -X POST "http://localhost:8000/api/bridges/?user_id=admin" \
  -H "Content-Type: application/json" \
  -d '{
    "bridge_name": "测试Bridge",
    "bridge_type": "local",
    "bridge_url": "ws://localhost:3766",
    "bridge_port": 3766,
    "max_concurrent": 1
  }'

# 测试 Server 启动
curl -X POST "http://localhost:8000/api/bridges/1/server/start?user_id=admin"

# 检查 Server 状态
curl "http://localhost:8000/api/bridges/1/server/status?user_id=admin"
```

---

## 🎯 性能优化建议

1. **使用 Gunicorn** (生产环境)
   ```bash
   gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.main:app
   ```

2. **启用 Nginx 缓存**
   ```nginx
   proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=bigtestagent:10m;
   ```

3. **数据库连接池**
   ```python
   # backend/database/session.py
   engine = create_engine(
       DATABASE_URL,
       pool_size=10,
       max_overflow=20
   )
   ```

4. **日志轮转**
   ```bash
   # /etc/logrotate.d/bigtestagent
   /var/log/bigtestagent/*.log {
       daily
       rotate 7
       compress
       delaycompress
       notifempty
       create 0640 bigtestagent bigtestagent
   }
   ```

---

## 📚 相关文档

- [Bridge Server 自动管理](./BRIDGE_SERVER_AUTO_MANAGEMENT.md)
- [部署指南](../../deploy/doc/BRIDGE_SERVER_DEPLOYMENT.md)
- [快速开始](./QUICK_START.md)
- [使用示例](./USAGE_EXAMPLE.md)

---

## ✅ 总结

**最简单的部署**：
1. 确保 `scripts/bridge-server-standalone.cjs` 存在
2. 启动 Backend
3. ✅ 完成！

**自定义部署**：
1. 复制脚本到自定义位置
2. 设置 `MIDSCENE_BRIDGE_SERVER_PATH` 环境变量
3. 启动 Backend
4. ✅ 完成！

无论哪种方式，系统都会自动找到并使用 Bridge Server 脚本！🚀

