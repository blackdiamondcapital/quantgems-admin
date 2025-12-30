<script setup>
import { onMounted, ref } from 'vue'
import { users as apiUsers } from '../lib/api.js'

const q = ref('')
const loading = ref(false)
const error = ref(null)
const rows = ref([])

async function refresh() {
  try {
    loading.value = true
    error.value = null
    rows.value = await apiUsers({ q: q.value, limit: 100, offset: 0 })
  } catch (e) {
    error.value = e?.message || '讀取用戶資料失敗'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  refresh()
})
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <input v-model="q" class="input" placeholder="搜尋 email/username" />
      <button class="ghost" :disabled="loading" @click="refresh">查詢</button>
    </div>

    <div v-if="error" class="alert">{{ error }}</div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>使用者名稱</th>
            <th>方案</th>
            <th>訂閱狀態</th>
            <th>Email 驗證</th>
            <th>帳號狀態</th>
            <th>最後登入</th>
            <th>建立時間</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="center">載入中…</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="8" class="center">尚無資料</td>
          </tr>
          <tr v-for="u in rows" :key="u.id">
            <td class="bold">{{ u.email }}</td>
            <td>{{ u.username || '-' }}</td>
            <td>{{ u.plan || '-' }}</td>
            <td>{{ u.subscription_status || '-' }}</td>
            <td>
              <span class="pill" :class="u.email_verified ? 'success' : 'warn'">
                {{ u.email_verified ? '已驗證' : '未驗證' }}
              </span>
            </td>
            <td>
              <span class="pill" :class="u.is_active ? 'success' : 'danger'">
                {{ u.is_active ? '啟用' : '停用' }}
              </span>
            </td>
            <td>{{ u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '-' }}</td>
            <td>{{ u.created_at ? new Date(u.created_at).toLocaleString() : '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar {
  display: flex;
  gap: 10px;
}

.input {
  flex: 1;
  border: 1px solid #1f2937;
  background: #0f172a;
  color: #e2e8f0;
  padding: 10px 12px;
  border-radius: 10px;
  outline: none;
}

.input:focus {
  border-color: #34d399;
}

.ghost {
  border: 1px solid #334155;
  background: transparent;
  color: #e2e8f0;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
}

.ghost:hover {
  background: #1f2937;
  border-color: #475569;
}

.alert {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.35);
  color: #fecdd3;
  white-space: pre-wrap;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th,
td {
  padding: 10px 8px;
  border-bottom: 1px solid #1f2937;
  white-space: nowrap;
}

th {
  text-align: left;
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.7);
}

.center {
  text-align: center;
  color: #94a3b8;
}

.bold {
  font-weight: 700;
}

.pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid #1f2937;
}

.pill.success {
  background: rgba(34, 197, 94, 0.15);
  color: #bbf7d0;
  border-color: rgba(34, 197, 94, 0.4);
}

.pill.warn {
  background: rgba(250, 204, 21, 0.15);
  color: #fef9c3;
  border-color: rgba(250, 204, 21, 0.35);
}

.pill.danger {
  background: rgba(248, 113, 113, 0.15);
  color: #fecdd3;
  border-color: rgba(248, 113, 113, 0.35);
}
</style>
