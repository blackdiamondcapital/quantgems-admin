<script setup>
import { onMounted, ref } from 'vue'
import { subscriptions as apiSubscriptions } from '../lib/api.js'

const q = ref('')
const status = ref('')
const plan = ref('')
const loading = ref(false)
const error = ref(null)
const rows = ref([])

async function refresh() {
  try {
    loading.value = true
    error.value = null
    rows.value = await apiSubscriptions({ q: q.value, status: status.value, plan: plan.value, limit: 100, offset: 0 })
  } catch (e) {
    error.value = e?.message || '讀取訂閱資料失敗'
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
      <input v-model="q" class="input" placeholder="搜尋 Email / 使用者名稱" />
      <input v-model="status" class="input small" placeholder="狀態" />
      <input v-model="plan" class="input small" placeholder="方案" />
      <button class="ghost" :disabled="loading" @click="refresh">查詢</button>
    </div>

    <div v-if="error" class="alert">{{ error }}</div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>使用者</th>
            <th>方案</th>
            <th>狀態</th>
            <th>金額</th>
            <th>開始時間</th>
            <th>結束時間</th>
            <th>自動續訂</th>
            <th>取消時間</th>
            <th>建立時間</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="10" class="center">載入中…</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="10" class="center">尚無資料</td>
          </tr>
          <tr v-for="s in rows" :key="s.id">
            <td class="mono">{{ s.id }}</td>
            <td class="bold">{{ s.user_email || s.user_id }}</td>
            <td>{{ s.plan }}</td>
            <td>{{ s.status }}</td>
            <td>{{ s.amount }} {{ s.currency }}</td>
            <td>{{ s.start_date ? new Date(s.start_date).toLocaleString() : '-' }}</td>
            <td>{{ s.end_date ? new Date(s.end_date).toLocaleString() : '-' }}</td>
            <td>{{ s.auto_renew ? 'Y' : 'N' }}</td>
            <td>{{ s.cancelled_at ? new Date(s.cancelled_at).toLocaleString() : '-' }}</td>
            <td>{{ s.created_at ? new Date(s.created_at).toLocaleString() : '-' }}</td>
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
  flex-wrap: wrap;
}

.input {
  flex: 1;
  min-width: 220px;
  border: 1px solid #1f2937;
  background: #0f172a;
  color: #e2e8f0;
  padding: 10px 12px;
  border-radius: 10px;
  outline: none;
}

.input.small {
  flex: 0;
  min-width: 160px;
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

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
</style>
