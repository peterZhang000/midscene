# Bridge Server 自动管理 - 使用示例

## 🚀 快速开始（Local 模式 - 推荐）

### 场景：Backend 和 Browser 在同一台机器

```bash
# 1. 启动 BigTestAgent Backend
cd /Users/peter/PycharmProjects/BigTestAgent/backend
python run.py

# 2. 通过 API 创建 local Bridge（Backend 会自动启动 Bridge Server）
curl -X POST "http://localhost:8000/api/bridges/?user_id=admin" \
  -H "Content-Type: application/json" \
  -d '{
    "bridge_name": "我的本地Bridge",
    "bridge_type": "local",
    "bridge_url": "ws://localhost:3766",
    "bridge_port": 3766,
    "is_default": true,
    "max_concurrent": 1
  }'

# 3. 查看 Bridge Server 状态
curl "http://localhost:8000/api/bridges/1/server/status?user_id=admin"

# 响应：
# {
#   "bridge_type": "local",
#   "managed": true,
#   "running": true,
#   "pid": 12345,
#   "port": 3766,
#   "started_at": "2025-10-28T10:30:00"
# }

# 4. 打开 Chrome Extension，点击"启动 Bridge"
# 5. ✅ 完成！可以开始执行测试用例了
```

---

## 🌐 VPN 模式（Backend 和 Browser 在局域网）

### 场景：Backend 在 192.168.1.100，Browser 在 192.168.1.200

**在 Browser 机器（192.168.1.200）上：**
```bash
# 1. 启动 Bridge Server
cd /Users/peter/Documents/automation-test/midscene
node packages/web-integration/dist/bridge-server.js --port 3766

# 看到输出：
# Bridge Server listening on port 3766
```

**在 Backend 机器（192.168.1.100）上：**
```bash
# 2. 创建 vpn Bridge（指向 Browser 机器）
curl -X POST "http://localhost:8000/api/bridges/?user_id=admin" \
  -H "Content-Type: application/json" \
  -d '{
    "bridge_name": "团队共享Bridge",
    "bridge_type": "vpn",
    "bridge_url": "ws://192.168.1.200:3766",
    "bridge_port": 3766,
    "is_default": true,
    "max_concurrent": 1
  }'

# 3. Backend 会自动健康检查，但不会启动 Bridge Server
```

**在 Browser 机器上：**
```bash
# 4. 打开 Chrome Extension，点击"启动 Bridge"
# 5. ✅ 完成！
```

---

## ☁️ Remote 模式（Backend 在云端，Browser 在本地）

### 场景：Backend 在 cloud.example.com，Browser 在用户本地

**在用户本地机器上：**
```bash
# 1. 启动 Bridge Server
cd /Users/peter/Documents/automation-test/midscene
node packages/web-integration/dist/bridge-server.js --port 3766

# 2. 使用 ngrok 暴露端口
ngrok http 3766

# 看到输出：
# Forwarding: https://abc123.ngrok.io -> http://localhost:3766
```

**在云端 Backend 上：**
```bash
# 3. 创建 remote Bridge（使用 ngrok URL）
curl -X POST "http://cloud.example.com:8000/api/bridges/?user_id=admin" \
  -H "Content-Type: application/json" \
  -d '{
    "bridge_name": "远程Bridge",
    "bridge_type": "remote",
    "bridge_url": "wss://abc123.ngrok.io",
    "bridge_port": 443,
    "is_default": true,
    "max_concurrent": 1
  }'
```

**在用户本地机器上：**
```bash
# 4. 打开 Chrome Extension，点击"启动 Bridge"
# 5. ✅ 完成！
```

---

## 🔧 管理操作

### 手动启动/停止 Bridge Server（仅 local 类型）

```bash
# 启动
curl -X POST "http://localhost:8000/api/bridges/1/server/start?user_id=admin"

# 停止
curl -X POST "http://localhost:8000/api/bridges/1/server/stop?user_id=admin"

# 查看状态
curl "http://localhost:8000/api/bridges/1/server/status?user_id=admin"
```

### 查看所有 Bridge

```bash
curl "http://localhost:8000/api/bridges/?user_id=admin&page=1&page_size=20"
```

### 健康检查

```bash
# 立即检查
curl -X POST "http://localhost:8000/api/bridges/1/check-now"

# 查看健康汇总
curl "http://localhost:8000/api/bridges/1/health/summary"
```

---

## 📊 多 Bridge 并发示例

### 场景：一个用户需要多个浏览器实例

```bash
# Bridge 1: Chrome Profile 1 (端口 3766)
curl -X POST "http://localhost:8000/api/bridges/?user_id=admin" \
  -H "Content-Type: application/json" \
  -d '{
    "bridge_name": "Profile1",
    "bridge_type": "local",
    "bridge_url": "ws://localhost:3766",
    "bridge_port": 3766,
    "chrome_profile": "Profile 1",
    "max_concurrent": 1
  }'

# Bridge 2: Chrome Profile 2 (端口 3767)
curl -X POST "http://localhost:8000/api/bridges/?user_id=admin" \
  -H "Content-Type: application/json" \
  -d '{
    "bridge_name": "Profile2",
    "bridge_type": "local",
    "bridge_url": "ws://localhost:3767",
    "bridge_port": 3767,
    "chrome_profile": "Profile 2",
    "max_concurrent": 1
  }'

# Backend 会自动在不同端口启动两个 Bridge Server 进程
# 用户可以同时使用两个浏览器实例执行测试
```

---

## 🎯 前端集成示例（Vue）

```vue
<template>
  <div class="bridge-management">
    <h2>Bridge 管理</h2>
    
    <!-- 创建 Bridge -->
    <el-form :model="bridgeForm" @submit.prevent="createBridge">
      <el-form-item label="Bridge 名称">
        <el-input v-model="bridgeForm.bridge_name" />
      </el-form-item>
      
      <el-form-item label="Bridge 类型">
        <el-select v-model="bridgeForm.bridge_type">
          <el-option label="Local（自动管理）" value="local" />
          <el-option label="VPN（手动管理）" value="vpn" />
          <el-option label="Remote（手动管理）" value="remote" />
        </el-select>
      </el-form-item>
      
      <el-form-item label="端口">
        <el-input-number v-model="bridgeForm.bridge_port" :min="3000" :max="9999" />
      </el-form-item>
      
      <el-button type="primary" @click="createBridge">创建</el-button>
    </el-form>
    
    <!-- Bridge 列表 -->
    <el-table :data="bridges" style="margin-top: 20px">
      <el-table-column prop="bridge_name" label="名称" />
      <el-table-column prop="bridge_type" label="类型" />
      <el-table-column prop="bridge_port" label="端口" />
      <el-table-column prop="health_status" label="健康状态">
        <template #default="{ row }">
          <el-tag :type="getHealthStatusType(row.health_status)">
            {{ row.health_status }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column label="Server 状态" v-if="row.bridge_type === 'local'">
        <template #default="{ row }">
          <el-button 
            size="small" 
            :type="row.server_running ? 'danger' : 'success'"
            @click="toggleBridgeServer(row)"
          >
            {{ row.server_running ? '停止' : '启动' }}
          </el-button>
        </template>
      </el-table-column>
      
      <el-table-column label="操作">
        <template #default="{ row }">
          <el-button size="small" @click="checkHealth(row.id)">健康检查</el-button>
          <el-button size="small" type="danger" @click="deleteBridge(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import request from '@/utils/request';
import { ElMessage } from 'element-plus';

const bridges = ref([]);
const bridgeForm = ref({
  bridge_name: '',
  bridge_type: 'local',
  bridge_port: 3766,
  max_concurrent: 1
});

// 获取 Bridge 列表
async function fetchBridges() {
  try {
    const response = await request.get('/api/bridges/', {
      params: { user_id: 'admin', page: 1, page_size: 20 }
    });
    
    bridges.value = response.data.items;
    
    // 如果是 local 类型，获取 Server 状态
    for (const bridge of bridges.value) {
      if (bridge.bridge_type === 'local') {
        const status = await request.get(`/api/bridges/${bridge.id}/server/status`, {
          params: { user_id: 'admin' }
        });
        bridge.server_running = status.data.running;
      }
    }
  } catch (error) {
    ElMessage.error('获取 Bridge 列表失败');
  }
}

// 创建 Bridge
async function createBridge() {
  try {
    await request.post('/api/bridges/', {
      ...bridgeForm.value,
      bridge_url: `ws://localhost:${bridgeForm.value.bridge_port}`,
      is_default: bridges.value.length === 0
    }, {
      params: { user_id: 'admin' }
    });
    
    ElMessage.success(
      bridgeForm.value.bridge_type === 'local' 
        ? 'Bridge 创建成功，Server 已自动启动' 
        : 'Bridge 创建成功，请手动启动 Bridge Server'
    );
    
    await fetchBridges();
  } catch (error) {
    ElMessage.error('创建 Bridge 失败');
  }
}

// 启动/停止 Bridge Server（仅 local 类型）
async function toggleBridgeServer(bridge) {
  try {
    const action = bridge.server_running ? 'stop' : 'start';
    await request.post(`/api/bridges/${bridge.id}/server/${action}`, {}, {
      params: { user_id: 'admin' }
    });
    
    ElMessage.success(`Bridge Server ${action === 'start' ? '启动' : '停止'}成功`);
    await fetchBridges();
  } catch (error) {
    ElMessage.error('操作失败');
  }
}

// 健康检查
async function checkHealth(bridgeId) {
  try {
    const result = await request.post(`/api/bridges/${bridgeId}/check-now`);
    ElMessage.success(`健康检查完成: ${result.data.status}`);
    await fetchBridges();
  } catch (error) {
    ElMessage.error('健康检查失败');
  }
}

// 删除 Bridge
async function deleteBridge(bridgeId) {
  try {
    await request.delete(`/api/bridges/${bridgeId}`, {
      params: { user_id: 'admin' }
    });
    ElMessage.success('Bridge 删除成功');
    await fetchBridges();
  } catch (error) {
    ElMessage.error('删除失败');
  }
}

function getHealthStatusType(status) {
  return {
    healthy: 'success',
    unhealthy: 'danger',
    unknown: 'info'
  }[status] || 'info';
}

onMounted(() => {
  fetchBridges();
});
</script>
```

---

## 🎉 总结

根据你的部署场景选择合适的 Bridge 类型：

| 你的场景 | 选择类型 | 操作步骤 |
|---------|---------|---------|
| 我在本地开发，Backend 和 Browser 在同一台机器 | **local** | 1️⃣ 创建 Bridge → ✅ 自动启动 |
| 我在公司内网，Backend 在服务器上 | **vpn** | 1️⃣ 手动启动 Server → 2️⃣ 创建 Bridge |
| 我用 SaaS 平台，Backend 在云端 | **remote** | 1️⃣ 手动启动 Server → 2️⃣ 暴露端口 → 3️⃣ 创建 Bridge |

**最简单的方式**：使用 **local** 模式，一键创建，Backend 自动处理所有事情！🚀

