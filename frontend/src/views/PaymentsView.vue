<script setup>
import { onMounted, ref } from 'vue'
import { payments as apiPayments } from '../lib/api.js'

const q = ref('')
const status = ref('')
const gateway = ref('')
const loading = ref(false)
const error = ref(null)
const rows = ref([])

async function refresh() {
  try {
    loading.value = true
    error.value = null
    rows.value = await apiPayments({ q: q.value, status: status.value, gateway: gateway.value, limit: 100, offset: 0 })
  } catch (e) {
    error.value = e?.message || '讀取付款資料失敗'
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
      <input v-model="q" class="input" placeholder="搜尋 Email / 訂單號 / 交易序號" />
      <input v-model="status" class="input small" placeholder="狀態" />
      <input v-model="gateway" class="input small" placeholder="金流" />
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
            <th>金流</th>
            <th>訂單號</th>
            <th>交易序號</th>
            <th>付款時間</th>
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
          <tr v-for="p in rows" :key="p.id">
            <td class="mono">{{ p.id }}</td>
            <td class="bold">{{ p.user_email || '-' }}</td>
            <td>{{ p.subscription_plan || '-' }}</td>
            <td>{{ p.status }}</td>
            <td>{{ p.amount }} {{ p.currency }}</td>
            <td>{{ p.payment_gateway || '-' }}</td>
            <td class="mono">{{ p.merchant_trade_no || '-' }}</td>
            <td class="mono">{{ p.transaction_id || '-' }}</td>
            <td>{{ p.paid_at ? new Date(p.paid_at).toLocaleString() : '-' }}</td>
            <td>{{ p.created_at ? new Date(p.created_at).toLocaleString() : '-' }}</td>
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
</style>
