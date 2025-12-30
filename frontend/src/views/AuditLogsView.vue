<script setup>
import { onMounted, ref } from 'vue'
import { auditLogs as apiAuditLogs } from '../lib/api.js'

const q = ref('')
const action = ref('')
const loading = ref(false)
const error = ref(null)
const rows = ref([])

async function refresh() {
  try {
    loading.value = true
    error.value = null
    rows.value = await apiAuditLogs({ q: q.value, action: action.value, limit: 200, offset: 0 })
  } catch (e) {
    error.value = e?.message || '讀取稽核紀錄失敗'
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
      <input v-model="q" class="input" placeholder="搜尋 Email / 行為 / 類型 / IP" />
      <input v-model="action" class="input small" placeholder="行為(action)" />
      <button class="ghost" :disabled="loading" @click="refresh">查詢</button>
    </div>

    <div v-if="error" class="alert">{{ error }}</div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>時間</th>
            <th>使用者</th>
            <th>行為</th>
            <th>類型/ID</th>
            <th>IP</th>
            <th>使用者代理(UA)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="center">載入中…</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="6" class="center">尚無資料</td>
          </tr>
          <tr v-for="a in rows" :key="a.id">
            <td class="mono">{{ a.created_at ? new Date(a.created_at).toLocaleString() : '-' }}</td>
            <td class="bold">{{ a.user_email || '-' }}</td>
            <td>{{ a.action }}</td>
            <td class="mono">{{ a.entity_type || '-' }} {{ a.entity_id ?? '' }}</td>
            <td class="mono">{{ a.ip_address || '-' }}</td>
            <td class="ua">{{ a.user_agent || '-' }}</td>
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
  min-width: 240px;
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

.ua {
  max-width: 520px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
