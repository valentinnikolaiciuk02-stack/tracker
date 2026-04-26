import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from './stores/auth.js';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/auth', component: () => import('./pages/AuthPage.vue') },
    { path: '/dashboard', component: () => import('./pages/EmployeeDashboard.vue'), meta: { requiresAuth: true, role: 'employee' } },
    { path: '/admin', component: () => import('./pages/AdminDashboard.vue'), meta: { requiresAuth: true, role: 'admin' } },
    { path: '/admin/employee/:id', component: () => import('./pages/EmployeeHistory.vue'), meta: { requiresAuth: true, role: 'admin' } },
  ]
});

router.beforeEach((to, _, next) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isLoggedIn) return next('/auth');
  if (to.path === '/auth' && auth.isLoggedIn) return next(auth.isAdmin ? '/admin' : '/dashboard');
  if (to.meta.role === 'admin' && !auth.isAdmin) return next('/dashboard');
  if (to.meta.role === 'employee' && auth.isAdmin) return next('/admin');
  next();
});

export default router;
