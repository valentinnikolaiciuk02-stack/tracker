<template>
  <div class="page">
    <header class="header">
      <div class="logo"><span class="logo-mark">▣</span><span class="logo-text">TRACKER</span><span class="admin-badge">ADMIN</span></div>
      <div class="header-right">
        <button class="btn-icon" @click="load">↻ ОБНОВИТЬ</button>
        <button class="btn-logout" @click="logout">ВЫЙТИ</button>
      </div>
    </header>

    <main class="main">
      <!-- STATS ROW -->
      <div class="top-stats">
        <div class="top-stat">
          <div class="top-stat-val">{{ employees.length }}</div>
          <div class="top-stat-label">СОТРУДНИКОВ</div>
        </div>
        <div class="top-stat accent">
          <div class="top-stat-val">{{ activeNow.length }}</div>
          <div class="top-stat-label">НА ОБЪЕКТАХ</div>
        </div>
      </div>

      <!-- ACTIVE NOW -->
      <div v-if="activeNow.length" class="section">
        <div class="section-title">● СЕЙЧАС НА ОБЪЕКТАХ</div>
        <div class="active-list">
          <div v-for="a in activeNow" :key="a.id" class="active-row">
            <div class="active-avatar">{{ a.user_name[0] }}</div>
            <div class="active-info">
              <div class="active-name">{{ a.user_name }}</div>
              <div class="active-obj">📍 {{ a.object_name }}</div>
            </div>
            <div class="active-time">с {{ fmtTime(a.arrived_at) }}</div>
          </div>
        </div>
      </div>

      <!-- EMPLOYEES LIST -->
      <div class="section">
        <div class="section-title">▦ ВСЕ СОТРУДНИКИ</div>
        <div v-if="loading" class="loading">загрузка...</div>
        <div v-else class="emp-list">
          <RouterLink v-for="e in employees" :key="e.id" :to="`/admin/employee/${e.id}`" class="emp-row">
            <div class="emp-avatar">{{ e.name[0] }}</div>
            <div class="emp-info">
              <div class="emp-name">{{ e.name }}</div>
              <div class="emp-email">{{ e.email }}</div>
              <div v-if="e.current_object" class="emp-status on">● {{ e.current_object }}</div>
              <div v-else class="emp-status off">○ не на объекте</div>
            </div>
            <div class="emp-meta">
              <div class="emp-rate">{{ e.hourly_rate || 0 }} €/ч</div>
              <div class="emp-sessions">{{ e.total_sessions }} визитов</div>
              <div class="emp-arrow">→</div>
            <button class="btn-del" @click.prevent="deleteEmp(e)" title="Удалить">✕</button>
            </div>
          </RouterLink>
        </div>
      </div>
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

function fmtTime(d) { if (!d) return '—'; return new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); }

async function deleteEmp(e) {
  if (!confirm(`Удалить сотрудника ${e.name}? Все его данные будут удалены.`)) return;
  await api.delete(`/admin/employees/${e.id}`);
  await load();
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
.page { min-height: 100vh; display: flex; flex-direction: column; background: var(--c-black); }

.header { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-bottom: 1px solid var(--c-700); background: var(--c-900); position: sticky; top: 0; z-index: 100; }
.logo { display: flex; align-items: center; gap: 8px; }
.logo-mark { font-size: 1.2rem; color: var(--accent); }
.logo-text { font-family: var(--font-display); font-weight: 900; font-size: 1rem; letter-spacing: 0.12em; color: var(--c-white); }
.admin-badge { background: var(--accent); color: #000; font-family: var(--font-display); font-size: 0.55rem; font-weight: 900; letter-spacing: 0.12em; padding: 3px 7px; border-radius: 3px; }
.header-right { display: flex; gap: 8px; }
.btn-icon { background: var(--c-800); border: 1px solid var(--c-600); color: var(--c-300); padding: 5px 12px; border-radius: var(--r); cursor: pointer; font-family: var(--font-display); font-size: 0.65rem; letter-spacing: 0.08em; transition: all 0.15s; }
.btn-icon:hover { border-color: var(--accent); color: var(--accent); }
.btn-logout { background: transparent; border: 1px solid var(--c-600); color: var(--c-400); padding: 5px 12px; border-radius: var(--r); cursor: pointer; font-family: var(--font-display); font-size: 0.65rem; letter-spacing: 0.08em; transition: all 0.15s; }
.btn-logout:hover { border-color: var(--red); color: var(--red); }

.main { flex: 1; max-width: 860px; margin: 0 auto; width: 100%; padding: 24px 16px; display: flex; flex-direction: column; gap: 24px; }

.top-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.top-stat { background: var(--c-900); border: 1px solid var(--c-700); border-radius: var(--r-lg); padding: 20px; }
.top-stat.accent { border-color: rgba(200,255,0,0.3); background: linear-gradient(135deg, rgba(200,255,0,0.04), var(--c-900)); }
.top-stat-val { font-family: var(--font-display); font-size: 2.4rem; font-weight: 900; color: var(--accent); line-height: 1; }
.top-stat-label { font-family: var(--font-display); font-size: 0.6rem; font-weight: 700; letter-spacing: 0.15em; color: var(--c-400); margin-top: 6px; }

.section-title { font-family: var(--font-display); font-size: 0.65rem; font-weight: 700; letter-spacing: 0.15em; color: var(--c-400); margin-bottom: 12px; }
.loading { color: var(--c-500); font-size: 0.82rem; padding: 24px; text-align: center; }

.active-list { display: flex; flex-direction: column; gap: 8px; }
.active-row { display: flex; align-items: center; gap: 12px; background: rgba(0,230,118,0.04); border: 1px solid rgba(0,230,118,0.2); border-radius: var(--r); padding: 12px 16px; flex-wrap: wrap; }
.active-avatar { width: 36px; height: 36px; background: var(--green); color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 900; font-size: 1rem; flex-shrink: 0; }
.active-info { flex: 1; }
.active-name { font-weight: 600; font-size: 0.9rem; color: var(--c-white); }
.active-obj { font-size: 0.78rem; color: var(--c-400); margin-top: 2px; }
.active-time { font-size: 0.75rem; color: var(--green); white-space: nowrap; }

.emp-list { display: flex; flex-direction: column; gap: 6px; }
.emp-row { display: flex; align-items: center; gap: 14px; background: var(--c-900); border: 1px solid var(--c-700); border-radius: var(--r); padding: 14px 18px; text-decoration: none; color: inherit; transition: all 0.15s; }
.emp-row:hover { border-color: var(--accent); background: rgba(200,255,0,0.03); }
.emp-avatar { width: 40px; height: 40px; background: var(--c-700); border: 1px solid var(--c-600); color: var(--accent); border-radius: var(--r); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 900; font-size: 1.1rem; flex-shrink: 0; }
.emp-info { flex: 1; }
.emp-name { font-weight: 600; font-size: 0.92rem; color: var(--c-white); }
.emp-email { font-size: 0.75rem; color: var(--c-400); margin-top: 2px; }
.emp-status { font-size: 0.72rem; margin-top: 4px; }
.emp-status.on { color: var(--green); }
.emp-status.off { color: var(--c-500); }
.emp-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.emp-rate { font-family: var(--font-display); font-size: 0.8rem; font-weight: 700; color: var(--accent); }
.emp-sessions { font-size: 0.72rem; color: var(--c-400); }
.emp-arrow { color: var(--c-500); font-size: 1rem; }
.btn-del { background: transparent; border: 1px solid #3a1a1a; color: #663333; width: 28px; height: 28px; border-radius: 4px; cursor: pointer; font-size: 0.75rem; transition: all 0.15s; flex-shrink: 0; }
.btn-del:hover { background: #3a1a1a; color: #ff5555; border-color: #ff3333; }

@media (max-width: 500px) {
  .top-stats { grid-template-columns: 1fr; }
  .header { padding: 12px 16px; }
}
</style>
