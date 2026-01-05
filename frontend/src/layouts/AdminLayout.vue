<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { API_BASE, me as apiMe } from '../lib/api.js'
import { clearToken } from '../lib/auth.js'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const error = ref(null)
const admin = ref(null)

const title = computed(() => {
  const map = {
    '/dashboard': '總覽儀表板',
    '/settings/presence': '排隊/阻擋設定',
    '/users': '用戶管理',
    '/subscriptions': '訂閱管理',
    '/payments': '付款紀錄',
    '/audit-logs': '稽核紀錄',
  }
  return map[route.path] || '後台管理'
})

async function fetchAdmin() {
  try {
    loading.value = true
    error.value = null
    admin.value = await apiMe()
  } catch (e) {
    error.value = e?.message || '讀取管理員資訊失敗'
  } finally {
    loading.value = false
  }
}

function logout() {
  clearToken()
  router.push('/login')
}

onMounted(() => {
  fetchAdmin()
})
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="logo">QG</div>
        <div>
          <div class="brand-title">QuantGems</div>
          <div class="brand-sub">管理後台</div>
        </div>
      </div>

      <nav class="nav">
        <RouterLink to="/dashboard" class="nav-item" active-class="active">總覽儀表板</RouterLink>
        <RouterLink to="/settings/presence" class="nav-item" active-class="active">排隊/阻擋設定</RouterLink>
        <RouterLink to="/users" class="nav-item" active-class="active">用戶管理</RouterLink>
        <RouterLink to="/subscriptions" class="nav-item" active-class="active">訂閱管理</RouterLink>
        <RouterLink to="/payments" class="nav-item" active-class="active">付款紀錄</RouterLink>
        <RouterLink to="/audit-logs" class="nav-item" active-class="active">稽核紀錄</RouterLink>
      </nav>

      <div class="sidebar-footer">
        <div class="api">API: {{ API_BASE }}</div>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <div>
          <div class="page-title">{{ title }}</div>
          <div class="page-sub">{{ route.path }}</div>
        </div>

        <div class="topbar-right">
          <span v-if="admin" class="pill success">{{ admin.email }}</span>
          <span v-else class="pill muted">未登入</span>
          <button class="ghost" @click="logout">登出</button>
        </div>
      </header>

      <div v-if="error" class="alert">{{ error }}</div>

      <main class="content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 260px 1fr;
  background: radial-gradient(circle at 20% 20%, #0f172a, #020617 60%);
  color: #e2e8f0;
  font-family: "Inter", "Noto Sans TC", system-ui, -apple-system, sans-serif;
}

.sidebar {
  border-right: 1px solid #1e293b;
  padding: 16px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid #1f2937;
}

.logo {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: linear-gradient(135deg, #22c55e, #10b981);
  color: #071018;
  font-weight: 800;
}

.brand-title {
  font-weight: 800;
}

.brand-sub {
  font-size: 12px;
  color: #94a3b8;
}

.nav {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  display: block;
  padding: 10px 12px;
  border-radius: 12px;
  color: #e2e8f0;
  border: 1px solid transparent;
  text-decoration: none;
  background: transparent;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.nav-item:hover {
  background: rgba(31, 41, 55, 0.6);
  border-color: #1f2937;
}

.nav-item.active {
  background: rgba(16, 185, 129, 0.14);
  border-color: rgba(16, 185, 129, 0.35);
  color: #bbf7d0;
}

.sidebar-footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #1e293b;
}

.api {
  font-size: 12px;
  color: #94a3b8;
  word-break: break-all;
}

.main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid #1e293b;
  background: rgba(2, 6, 23, 0.6);
  backdrop-filter: blur(8px);
}

.page-title {
  font-size: 18px;
  font-weight: 800;
}

.page-sub {
  font-size: 12px;
  color: #94a3b8;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.content {
  padding: 18px 20px 30px;
}

.pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid #1f2937;
}

.pill.success {
  background: rgba(34, 197, 94, 0.15);
  color: #bbf7d0;
  border-color: rgba(34, 197, 94, 0.4);
}

.pill.muted {
  background: #1f2937;
  color: #cbd5e1;
  border-color: #27303e;
}

.ghost {
  border: 1px solid #334155;
  background: transparent;
  color: #e2e8f0;
  padding: 8px 12px;
  border-radius: 10px;
  cursor: pointer;
}

.ghost:hover {
  background: #1f2937;
  border-color: #475569;
}

.alert {
  margin: 14px 20px 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.35);
  color: #fecdd3;
}

@media (max-width: 900px) {
  .shell {
    grid-template-columns: 1fr;
  }
  .sidebar {
    border-right: none;
    border-bottom: 1px solid #1e293b;
  }
}
</style>
