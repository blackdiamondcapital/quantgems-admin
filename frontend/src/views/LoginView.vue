<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login as apiLogin, API_BASE } from '../lib/api.js'
import { setToken } from '../lib/auth.js'

const route = useRoute()
const router = useRouter()

const email = ref(import.meta.env.VITE_ADMIN_DEFAULT_EMAIL || 'alex419122@gmail.com')
const password = ref('')
const loading = ref(false)
const error = ref(null)

async function handleLogin() {
  try {
    loading.value = true
    error.value = null
    const data = await apiLogin(email.value, password.value)
    setToken(data.token)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    router.push(redirect)
  } catch (e) {
    error.value = e?.message || '登入失敗'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="card">
      <div class="head">
        <div class="title">QuantGems 管理後台</div>
        <div class="sub">API: {{ API_BASE }}</div>
      </div>

      <div class="field">
        <label>管理員 Email</label>
        <input v-model="email" type="email" placeholder="admin@example.com" />
      </div>
      <div class="field">
        <label>密碼</label>
        <input v-model="password" type="password" placeholder="••••••••" />
      </div>

      <button class="primary" :disabled="loading" @click="handleLogin">
        {{ loading ? '登入中…' : '登入' }}
      </button>

      <div v-if="error" class="error">{{ error }}</div>

      <div class="hint">
        開發環境會自動進入系統；若在正式環境，需使用帳密登入。
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: radial-gradient(circle at 20% 20%, #0f172a, #020617 60%);
  color: #e2e8f0;
  font-family: "Inter", "Noto Sans TC", system-ui, -apple-system, sans-serif;
}

.card {
  width: 100%;
  max-width: 420px;
  background: #0b1220;
  border: 1px solid #1f2937;
  border-radius: 16px;
  padding: 18px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

.head {
  margin-bottom: 14px;
}

.title {
  font-size: 22px;
  font-weight: 900;
}

.sub {
  font-size: 12px;
  color: #94a3b8;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 10px 0;
  font-size: 14px;
}

input {
  border: 1px solid #1f2937;
  background: #0f172a;
  color: #e2e8f0;
  padding: 10px 12px;
  border-radius: 10px;
  outline: none;
}

input:focus {
  border-color: #34d399;
}

.primary {
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #22c55e, #10b981);
  color: #0b1120;
  font-weight: 800;
  cursor: pointer;
}

.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  margin-top: 10px;
  border: 1px solid rgba(248, 113, 113, 0.35);
  background: rgba(248, 113, 113, 0.12);
  color: #fecdd3;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
  white-space: pre-wrap;
}

.hint {
  margin-top: 12px;
  font-size: 12px;
  color: #94a3b8;
}
</style>
