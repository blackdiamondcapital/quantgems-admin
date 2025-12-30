import { createRouter, createWebHistory } from 'vue-router'
import { getToken, setToken } from '../lib/auth'

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

  if (!isPublic && !token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.path === '/login' && token) {
    return { path: '/dashboard' }
  }
  return true
})

export default router
