<script setup>
import { onMounted, ref } from 'vue'
import { getPresenceSettings, updatePresenceSettings } from '../lib/api.js'

const loading = ref(false)
const saving = ref(false)
const error = ref(null)
const success = ref(null)

const enableQueue = ref(false)
const maxOnlineUsers = ref('0')
const blockQueuedWriteHeavy = ref(true)

async function refresh() {
  try {
    loading.value = true
    error.value = null
    success.value = null

    const data = await getPresenceSettings()
    enableQueue.value = Boolean(data?.enable_queue)
    maxOnlineUsers.value = String(data?.max_online_users ?? '0')
    blockQueuedWriteHeavy.value = Boolean(data?.block_queued_write_heavy)
  } catch (e) {
    error.value = e?.message || '讀取設定失敗'
  } finally {
    loading.value = false
  }
}

async function save() {
  try {
    saving.value = true
    error.value = null
    success.value = null

    const parsedMax = Number.parseInt(String(maxOnlineUsers.value || '0'), 10)
    if (!Number.isFinite(parsedMax) || parsedMax < 0) {
      error.value = 'max_online_users 必須為非負整數'
      return
    }

    const next = {
      enable_queue: Boolean(enableQueue.value),
      max_online_users: parsedMax,
      block_queued_write_heavy: Boolean(blockQueuedWriteHeavy.value),
    }

    const data = await updatePresenceSettings(next)

    enableQueue.value = Boolean(data?.enable_queue)
    maxOnlineUsers.value = String(data?.max_online_users ?? '0')
    blockQueuedWriteHeavy.value = Boolean(data?.block_queued_write_heavy)

    success.value = '已儲存（主站約 5 秒內生效）'
  } catch (e) {
    error.value = e?.message || '儲存失敗'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  refresh()
})
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <button class="ghost" :disabled="loading || saving" @click="refresh">重新整理</button>
      <button class="primary" :disabled="loading || saving" @click="save">
        {{ saving ? '儲存中…' : '儲存設定' }}
      </button>
    </div>

    <div v-if="error" class="alert">{{ error }}</div>
    <div v-if="success" class="ok">{{ success }}</div>

    <div class="card">
      <div class="row">
        <div class="left">
          <div class="label">啟用排隊（enable_queue）</div>
          <div class="hint">關閉時：主站視為無排隊，所有人都視為 admitted。</div>
        </div>
        <label class="switch">
          <input v-model="enableQueue" type="checkbox" />
          <span class="slider" />
        </label>
      </div>

      <div class="row">
        <div class="left">
          <div class="label">最大在線人數（max_online_users）</div>
          <div class="hint">0 代表不限制（若 enable_queue 關閉也會視為不限制）。</div>
        </div>
        <input v-model="maxOnlineUsers" class="input" inputmode="numeric" />
      </div>

      <div class="row">
        <div class="left">
          <div class="label">阻擋 queued 的寫入/重運算（block_queued_write_heavy）</div>
          <div class="hint">關閉時：queued 也可呼叫原本被擋的 heavy/write API（不建議）。</div>
        </div>
        <label class="switch">
          <input v-model="blockQueuedWriteHeavy" type="checkbox" />
          <span class="slider" />
        </label>
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
  gap: 10px;
}

.card {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid #1f2937;
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #1f2937;
}

.row:last-child {
  border-bottom: none;
}

.left {
  min-width: 0;
}

.label {
  font-weight: 800;
}

.hint {
  margin-top: 4px;
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.4;
}

.input {
  width: 140px;
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

.alert {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.35);
  color: #fecdd3;
  white-space: pre-wrap;
}

.ok {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.35);
  color: #bbf7d0;
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

.primary {
  border: 1px solid rgba(16, 185, 129, 0.35);
  background: rgba(16, 185, 129, 0.18);
  color: #bbf7d0;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 800;
}

.primary:hover {
  background: rgba(16, 185, 129, 0.26);
}

.primary:disabled,
.ghost:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.switch {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.switch input {
  display: none;
}

.slider {
  width: 46px;
  height: 26px;
  border-radius: 999px;
  background: #1f2937;
  border: 1px solid #334155;
  position: relative;
  transition: background 0.15s ease;
}

.slider::after {
  content: '';
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: #e2e8f0;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.15s ease;
}

.switch input:checked + .slider {
  background: rgba(16, 185, 129, 0.35);
  border-color: rgba(16, 185, 129, 0.45);
}

.switch input:checked + .slider::after {
  transform: translateX(20px);
}
</style>
