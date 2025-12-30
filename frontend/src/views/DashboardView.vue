<script setup>
import { onMounted, ref } from 'vue'
import { status as apiStatus } from '../lib/api.js'

const loading = ref(false)
const error = ref(null)
const data = ref(null)

async function refresh() {
  try {
    loading.value = true
    error.value = null
    data.value = await apiStatus()
  } catch (e) {
    error.value = e?.message || '讀取狀態失敗'
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
      <button class="ghost" :disabled="loading" @click="refresh">重新整理</button>
    </div>

    <div v-if="error" class="alert">{{ error }}</div>

    <div class="cards">
      <div class="card">
        <div class="label">環境</div>
        <div class="value">{{ data?.env || '-' }}</div>
      </div>
      <div class="card">
        <div class="label">運行時間</div>
        <div class="value">{{ data?.uptimeSeconds ? Math.round(data.uptimeSeconds) + 's' : '-' }}</div>
      </div>
      <div class="card">
        <div class="label">資料庫</div>
        <div class="value">{{ data?.db?.ok ? '正常' : '異常' }}</div>
        <div v-if="data?.db?.error" class="sub">{{ data.db.error }}</div>
      </div>
      <div class="card">
        <div class="label">用戶數</div>
        <div class="value">{{ data?.counts?.users ?? '-' }}</div>
      </div>
      <div class="card">
        <div class="label">訂閱筆數</div>
        <div class="value">{{ data?.counts?.subscriptions ?? '-' }}</div>
      </div>
      <div class="card">
        <div class="label">付款筆數</div>
        <div class="value">{{ data?.counts?.payments ?? '-' }}</div>
      </div>
      <div class="card">
        <div class="label">稽核紀錄筆數</div>
        <div class="value">{{ data?.counts?.audit_logs ?? '-' }}</div>
      </div>
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
  justify-content: flex-end;
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
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.35);
  color: #fecdd3;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.card {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid #1f2937;
  border-radius: 14px;
  padding: 14px;
}

.label {
  font-size: 12px;
  color: #94a3b8;
}

.value {
  margin-top: 6px;
  font-size: 22px;
  font-weight: 900;
}

.sub {
  margin-top: 8px;
  font-size: 12px;
  color: #94a3b8;
  word-break: break-all;
}
</style>
