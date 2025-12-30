import { createRouter, createWebHistory } from 'vue-router'
import { getToken, setToken } from '../lib/auth.js'
import { exchangeKey } from '../lib/api.js'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('../layouts/AdminLayout.vue'),
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('../views/DashboardView.vue'),
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('../views/UsersView.vue'),
        },
        {
          path: 'subscriptions',
          name: 'subscriptions',
          component: () => import('../views/SubscriptionsView.vue'),
        },
        {
          path: 'payments',
          name: 'payments',
          component: () => import('../views/PaymentsView.vue'),
        },
        {
          path: 'audit-logs',
          name: 'audit-logs',
          component: () => import('../views/AuditLogsView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const isPublic = Boolean(to.meta.public)
  let token = getToken()

  // Dev convenience: auto bypass login in non-production env.
  if (!token && !isPublic && import.meta.env.DEV) {
    setToken('dev-bypass-token')
    token = 'dev-bypass-token'
  }

  // Production convenience: if provided a shared access key, exchange it for a short-lived JWT.
  const accessKey = import.meta.env.VITE_ADMIN_ACCESS_KEY
  if (!token && !isPublic && !import.meta.env.DEV && accessKey) {
    return exchangeKey(accessKey)
      .then((data) => {
        if (data && data.token) {
          setToken(data.token)
          return true
        }
        return { path: '/login', query: { redirect: to.fullPath } }
      })
      .catch(() => ({ path: '/login', query: { redirect: to.fullPath } }))
  }

  if (!isPublic && !token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.path === '/login' && token) {
    return { path: '/dashboard' }
  }
  return true
})

export default router
