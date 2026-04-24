<template>
  <div class="page">
    <header class="header">
      <div class="logo">
        <span class="logo-icon">◈</span>
        <span class="logo-name">TRACKER</span>
        <span class="admin-badge">ADMIN</span>
      </div>
      <div class="header-right">
        <button class="btn-refresh" @click="load">🔄 Обновить</button>
        <button class="btn-icon" @click="logout">Выйти</button>
      </div>
    </header>

    <main class="main">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ employees.length }}</div>
          <div class="stat-label">Сотрудников</div>
        </div>
        <div class="stat-card stat-active">
          <div class="stat-value">{{ activeNow.length }}</div>
          <div class="stat-label">Сейчас на объектах</div>
        </div>
      </div>

      <section class="section" v-if="activeNow.length">
        <h3 class="section-title">🟢 Сейчас на объектах</h3>
        <div class="active-list">
          <div v-for="a in activeNow" :key="a.id" class="active-row">
            <div class="active-person">
              <div class="avatar">{{ a.user_name[0] }}</div>
              <div>
                <div class="active-name">{{ a.user_name }}</div>
                <div class="active-object">📍 {{ a.object_name }}</div>
              </div>
            </div>
            <div class="active-time">с {{ fmtDate(a.arrived_at) }}</div>
          </div>
        </div>
      </section>

      <section class="section">
        <h3 class="section-title">👥 Все сотрудники</h3>
        <div v-if="loading" class="loading">Загрузка...</div>
        <div v-else-if="!employees.length" class="empty">Нет зарегистрированных сотрудников</div>
        <div v-else class="emp-grid">
          <RouterLink v-for="e in employees" :key="e.id" :to="`/admin/employee/${e.id}`" class="emp-card">
            <div class="emp-avatar">{{ e.name[0] }}</div>
            <div class="emp-info">
              <div class="emp-name">{{ e.name }}</div>
              <div class="emp-email">{{ e.email }}</div>
              <div v-if="e.current_object" class="emp-status-on">🟢 {{ e.current_object }}</div>
              <div v-else class="emp-status-off">⚪ Не на объекте</div>
            </div>
            <div class="emp-meta">
              <div class="emp-sessions">{{ e.total_sessions }} визитов</div>
              <div class="emp-arrow">→</div>
            </div>
          </RouterLink>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import api from '../lib/api.js';

const auth = useAuthStore();
const router = useRouter();
const employees = ref([]);
const activeNow = ref([]);
const loading = ref(true);

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

async function load() {
  loading.value = true;
  const [emps, act] = await Promise.all([api.get('/admin/employees'), api.get('/admin/active')]);
  employees.value = emps.employees;
  activeNow.value = act.active;
  loading.value = false;
}

function logout() { auth.logout(); router.push('/auth'); }

onMounted(load);
</script>

<style scoped>
.page { min-height: 100vh; display: flex; flex-direction: column; }

.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 32px; border-bottom: 1px solid var(--border);
  background: var(--bg2); position: sticky; top: 0; z-index: 100;
}
.logo { display: flex; align-items: center; gap: 8px; }
.logo-icon { font-size: 1.4rem; color: var(--accent); }
.logo-name { font-family: var(--font-display); font-weight: 800; font-size: 1.1rem; letter-spacing: 0.1em; }
.admin-badge { background: var(--accent); color: #000; font-family: var(--font-display); font-size: 0.65rem; font-weight: 800; letter-spacing: 0.1em; padding: 3px 8px; border-radius: 4px; }
.header-right { display: flex; align-items: center; gap: 10px; }
.btn-refresh { background: var(--surface); border: 1px solid var(--border); color: var(--muted2); padding: 6px 14px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; }
.btn-refresh:hover { border-color: var(--accent); color: var(--accent); }
.btn-icon { background: transparent; border: 1px solid var(--border); color: var(--muted); padding: 6px 14px; border-radius: 8px; cursor: pointer; font-size: 0.88rem; transition: all 0.2s; }
.btn-icon:hover { border-color: var(--red); color: var(--red); }

.main { flex: 1; max-width: 900px; margin: 0 auto; width: 100%; padding: 32px 24px; display: flex; flex-direction: column; gap: 32px; }

.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; text-align: center; }
.stat-active { background: var(--green-dim); border-color: rgba(0,229,160,0.25); }
.stat-value { font-family: var(--font-display); font-size: 2.8rem; font-weight: 800; color: var(--accent); line-height: 1; }
.stat-active .stat-value { color: var(--green); }
.stat-label { color: var(--muted); font-size: 0.85rem; margin-top: 6px; }

.section-title { font-size: 1rem; margin-bottom: 14px; color: var(--muted2); font-weight: 700; }
.loading, .empty { color: var(--muted); text-align: center; padding: 40px; }

.active-list { display: flex; flex-direction: column; gap: 10px; }
.active-row { background: var(--green-dim); border: 1px solid rgba(0,229,160,0.2); border-radius: 12px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.active-person { display: flex; align-items: center; gap: 12px; }
.avatar { width: 38px; height: 38px; background: var(--green); color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 800; font-size: 1rem; }
.active-name { font-weight: 600; font-size: 0.95rem; }
.active-object { font-size: 0.83rem; color: var(--muted2); }
.active-time { font-size: 0.83rem; color: var(--green); white-space: nowrap; }

.emp-grid { display: flex; flex-direction: column; gap: 8px; }
.emp-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 18px 22px; display: flex; align-items: center; gap: 16px; text-decoration: none; color: inherit; transition: all 0.2s; }
.emp-card:hover { border-color: var(--accent); background: var(--accent-dim); }
.emp-avatar { width: 46px; height: 46px; background: var(--surface2); border: 1px solid var(--border2); color: var(--accent); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 800; font-size: 1.2rem; flex-shrink: 0; }
.emp-info { flex: 1; }
.emp-name { font-weight: 700; font-size: 0.97rem; }
.emp-email { font-size: 0.82rem; color: var(--muted); margin-top: 2px; }
.emp-status-on { font-size: 0.8rem; color: var(--green); margin-top: 4px; }
.emp-status-off { font-size: 0.8rem; color: var(--muted); margin-top: 4px; }
.emp-meta { display: flex; align-items: center; gap: 14px; }
.emp-sessions { font-size: 0.8rem; color: var(--muted2); white-space: nowrap; }
.emp-arrow { color: var(--muted); font-size: 1.1rem; }

@media (max-width: 600px) {
  .header { padding: 14px 16px; }
  .main { padding: 20px 16px; }
  .stats-grid { grid-template-columns: 1fr; }
}
</style>
