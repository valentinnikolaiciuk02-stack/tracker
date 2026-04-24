<template>
  <div class="page">
    <header class="header">
      <div class="logo">
        <span class="logo-icon">◈</span>
        <span class="logo-name">TRACKER</span>
        <span class="admin-badge">ADMIN</span>
      </div>
      <RouterLink to="/admin" class="btn-back">← Назад</RouterLink>
    </header>

    <main class="main">
      <div v-if="loading" class="loading">Загрузка...</div>
      <template v-else>
        <div class="emp-header">
          <div class="emp-avatar">{{ employee?.name?.[0] }}</div>
          <div>
            <h1 class="emp-name">{{ employee?.name }}</h1>
            <p class="emp-email">{{ employee?.email }}</p>
          </div>
        </div>

        <div class="filters-row">
          <div class="date-filters">
            <button v-for="f in filters" :key="f.val" :class="['filter-btn', { active: dateFilter === f.val }]" @click="setFilter(f.val)">{{ f.label }}</button>
          </div>
          <div class="custom-range">
            <input type="date" v-model="customFrom" class="date-input" />
            <span style="color:var(--muted)">—</span>
            <input type="date" v-model="customTo" class="date-input" />
            <button class="btn-apply" @click="applyCustom">Применить</button>
          </div>
        </div>

        <div class="summary-row">
          <div class="summary-item">
            <div class="sum-val">{{ sessions.length }}</div>
            <div class="sum-label">Визитов</div>
          </div>
          <div class="summary-item">
            <div class="sum-val">{{ uniqueObjects }}</div>
            <div class="sum-label">Объектов</div>
          </div>
          <div class="summary-item">
            <div class="sum-val">{{ totalHours }}</div>
            <div class="sum-label">Часов работы</div>
          </div>
        </div>

        <div v-if="!sessions.length" class="empty">Нет записей за выбранный период</div>
        <div v-else class="sessions-list">
          <div v-for="s in sessions" :key="s.id" class="session-row">
            <div class="sess-left">
              <div class="sess-obj">📍 {{ s.object_name }}</div>
              <div class="sess-date">{{ fmtDay(s.arrived_at) }}</div>
            </div>
            <div class="sess-times">
              <div class="time-block">
                <span class="time-label">Прибыл</span>
                <span class="time-val arrive">{{ fmtTime(s.arrived_at) }}</span>
              </div>
              <div class="time-arrow">→</div>
              <div class="time-block">
                <span class="time-label">Ушёл</span>
                <span class="time-val leave" v-if="s.left_at">{{ fmtTime(s.left_at) }}</span>
                <span class="time-val still" v-else>на объекте</span>
              </div>
            </div>
            <div class="sess-dur" v-if="s.left_at">{{ duration(s.arrived_at, s.left_at) }}</div>
            <div class="sess-dur still-dur" v-else>⏳</div>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import api from '../lib/api.js';

const route = useRoute();
const employee = ref(null);
const sessions = ref([]);
const loading = ref(true);
const dateFilter = ref('all');
const customFrom = ref('');
const customTo = ref('');

const filters = [
  { label: 'Всё время', val: 'all' },
  { label: 'Сегодня', val: 'day' },
  { label: 'Неделя', val: 'week' },
  { label: 'Месяц', val: 'month' },
];

const uniqueObjects = computed(() => new Set(sessions.value.map(s => s.object_name)).size);
const totalHours = computed(() => {
  const mins = sessions.value.reduce((acc, s) => {
    if (!s.left_at) return acc;
    return acc + (new Date(s.left_at) - new Date(s.arrived_at)) / 60000;
  }, 0);
  return (mins / 60).toFixed(1);
});

function fmtDay(d) { if (!d) return ''; return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }); }
function fmtTime(d) { if (!d) return '—'; return new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); }
function duration(a, b) {
  const diff = Math.floor((new Date(b) - new Date(a)) / 60000);
  const h = Math.floor(diff / 60), m = diff % 60;
  return h > 0 ? `${h}ч ${m}м` : `${m}м`;
}

function getDateRange(filter) {
  const now = new Date();
  if (filter === 'day') return { from: now.toISOString().slice(0,10), to: now.toISOString().slice(0,10) };
  if (filter === 'week') { const f = new Date(now); f.setDate(now.getDate() - 7); return { from: f.toISOString().slice(0,10), to: now.toISOString().slice(0,10) }; }
  if (filter === 'month') { const f = new Date(now); f.setMonth(now.getMonth() - 1); return { from: f.toISOString().slice(0,10), to: now.toISOString().slice(0,10) }; }
  return {};
}

async function load(params = {}) {
  loading.value = true;
  const data = await api.get(`/admin/employees/${route.params.id}/history`, { params });
  employee.value = data.user;
  sessions.value = data.sessions;
  loading.value = false;
}

async function setFilter(val) { dateFilter.value = val; await load(getDateRange(val)); }
async function applyCustom() {
  dateFilter.value = '';
  const params = {};
  if (customFrom.value) params.from = customFrom.value;
  if (customTo.value) params.to = customTo.value;
  await load(params);
}

onMounted(() => load());
</script>

<style scoped>
.page { min-height: 100vh; display: flex; flex-direction: column; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 18px 32px; border-bottom: 1px solid var(--border); background: var(--bg2); position: sticky; top: 0; z-index: 100; }
.logo { display: flex; align-items: center; gap: 8px; }
.logo-icon { font-size: 1.4rem; color: var(--accent); }
.logo-name { font-family: var(--font-display); font-weight: 800; font-size: 1.1rem; letter-spacing: 0.1em; }
.admin-badge { background: var(--accent); color: #000; font-family: var(--font-display); font-size: 0.65rem; font-weight: 800; letter-spacing: 0.1em; padding: 3px 8px; border-radius: 4px; }
.btn-back { background: var(--surface); border: 1px solid var(--border); color: var(--muted2); padding: 8px 16px; border-radius: 8px; text-decoration: none; font-size: 0.88rem; transition: all 0.2s; }
.btn-back:hover { border-color: var(--accent); color: var(--accent); }

.main { flex: 1; max-width: 860px; margin: 0 auto; width: 100%; padding: 32px 24px; display: flex; flex-direction: column; gap: 24px; }
.loading, .empty { color: var(--muted); text-align: center; padding: 60px; }

.emp-header { display: flex; align-items: center; gap: 20px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; }
.emp-avatar { width: 60px; height: 60px; background: var(--accent); color: #000; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 800; font-size: 1.6rem; flex-shrink: 0; }
.emp-name { font-size: 1.4rem; font-weight: 800; }
.emp-email { color: var(--muted); font-size: 0.88rem; margin-top: 3px; }

.filters-row { display: flex; align-items: center; flex-wrap: wrap; gap: 14px; }
.date-filters { display: flex; gap: 6px; flex-wrap: wrap; }
.filter-btn { background: var(--surface); border: 1px solid var(--border); color: var(--muted); padding: 7px 14px; border-radius: 8px; cursor: pointer; font-size: 0.83rem; font-family: var(--font-display); font-weight: 600; transition: all 0.2s; }
.filter-btn.active, .filter-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }
.custom-range { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.date-input { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; color: var(--text); font-size: 0.85rem; transition: border-color 0.2s; }
.date-input:focus { outline: none; border-color: var(--accent); }
.btn-apply { background: var(--blue-dim); border: 1px solid var(--blue); color: var(--blue); padding: 7px 14px; border-radius: 8px; cursor: pointer; font-size: 0.83rem; font-family: var(--font-display); font-weight: 600; transition: all 0.2s; }
.btn-apply:hover { background: var(--blue); color: #fff; }

.summary-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.summary-item { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 18px; text-align: center; }
.sum-val { font-family: var(--font-display); font-size: 2rem; font-weight: 800; color: var(--accent); }
.sum-label { font-size: 0.8rem; color: var(--muted); margin-top: 4px; }

.sessions-list { display: flex; flex-direction: column; gap: 8px; }
.session-row { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px 22px; display: flex; align-items: center; gap: 24px; flex-wrap: wrap; transition: border-color 0.2s; }
.session-row:hover { border-color: var(--border2); }
.sess-left { flex: 1; min-width: 140px; }
.sess-obj { font-weight: 600; font-size: 0.95rem; }
.sess-date { font-size: 0.8rem; color: var(--muted); margin-top: 3px; }
.sess-times { display: flex; align-items: center; gap: 14px; }
.time-block { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.time-label { font-size: 0.7rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
.time-val { font-family: var(--font-display); font-size: 1rem; font-weight: 700; }
.time-val.arrive { color: var(--green); }
.time-val.leave { color: var(--red); }
.time-val.still { color: var(--amber); font-size: 0.8rem; }
.time-arrow { color: var(--muted); font-size: 0.9rem; }
.sess-dur { background: var(--blue-dim); color: var(--blue); border: 1px solid rgba(77,124,254,0.25); padding: 4px 12px; border-radius: 999px; font-size: 0.82rem; font-weight: 600; white-space: nowrap; }
.still-dur { background: var(--accent-dim); color: var(--amber); border-color: transparent; }

@media (max-width: 600px) {
  .header { padding: 14px 16px; }
  .main { padding: 20px 16px; }
  .summary-row { grid-template-columns: 1fr; }
  .session-row { flex-direction: column; align-items: flex-start; }
}
</style>
