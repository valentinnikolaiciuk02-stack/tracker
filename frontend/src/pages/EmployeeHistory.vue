<template>
  <div class="page">
    <header class="header">
      <div class="logo"><span class="logo-mark">▣</span><span class="logo-text">TRACKER</span><span class="admin-badge">ADMIN</span></div>
      <RouterLink to="/admin" class="btn-back">← НАЗАД</RouterLink>
    </header>

    <main class="main">
      <div v-if="loading" class="loading">загрузка...</div>
      <template v-else>

        <!-- EMPLOYEE CARD -->
        <div class="emp-card">
          <div class="emp-avatar">{{ employee?.name?.[0] }}</div>
          <div class="emp-details">
            <div class="emp-name">{{ employee?.name }}</div>
            <div class="emp-email">{{ employee?.email }}</div>
          </div>
          <div class="rate-block">
            <div class="rate-label">СТАВКА (€/ч)</div>
            <div class="rate-row">
              <input v-model.number="editRate" type="number" min="0" step="0.5" class="rate-input" />
              <button class="btn-save" @click="saveRate" :disabled="savingRate">{{ savingRate ? '...' : 'СОХРАНИТЬ' }}</button>
            </div>
            <div v-if="rateSaved" class="rate-ok">✓ сохранено</div>
          </div>
        </div>

        <!-- PERIOD STATS -->
        <div class="period-tabs">
          <button v-for="p in periods" :key="p.val" :class="['ptab', { active: period === p.val }]" @click="period = p.val">{{ p.label }}</button>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">РАБОТА</div>
            <div class="stat-val work">{{ fmtDur(currentStats?.work_minutes) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">ДОРОГА</div>
            <div class="stat-val travel">{{ fmtDur(currentStats?.travel_minutes) }}</div>
          </div>
          <div class="stat-card earn">
            <div class="stat-label">ЗАРАБОТОК</div>
            <div class="stat-val accent">{{ currentStats?.earnings }} €</div>
          </div>
        </div>

        <!-- FILTERS -->
        <div class="filters-row">
          <div class="filter-tabs">
            <button v-for="f in filters" :key="f.val" :class="['ftab', { active: dateFilter === f.val }]" @click="setFilter(f.val)">{{ f.label }}</button>
          </div>
          <div class="custom-range">
            <input type="date" v-model="customFrom" class="date-input" />
            <span>—</span>
            <input type="date" v-model="customTo" class="date-input" />
            <button class="btn-apply" @click="applyCustom">ОК</button>
          </div>
        </div>

        <!-- TIMELINE -->
        <div v-if="!timeline.length" class="empty">нет записей за период</div>
        <div v-else class="timeline">
          <div v-for="item in timeline" :key="item.type + item.id" :class="['timeline-item', item.type]">
            <div class="tl-marker"></div>
            <div class="tl-content">
              <div class="tl-header">
                <span class="tl-type">{{ item.type === 'work' ? '🏗 РАБОТА' : '🚗 ДОРОГА' }}</span>
                <span class="tl-dur">{{ fmtDur(item.duration_minutes) }}</span>
              </div>
              <div class="tl-name">{{ item.type === 'work' ? item.object_name : `от: ${item.from_object_name || '—'}` }}</div>
              <div class="tl-times">
                <span class="tl-dt">{{ fmtDateTime(item.type === 'work' ? item.arrived_at : item.started_at) }}</span>
                <span class="tl-arrow">→</span>
                <span class="tl-dt">{{ (item.type === 'work' ? item.left_at : item.ended_at) ? fmtDateTime(item.type === 'work' ? item.left_at : item.ended_at) : '—' }}</span>
              </div>
            </div>
          </div>
        </div>

      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import api from '../lib/api.js';

const route = useRoute();
const employee = ref(null);
const fullStats = ref({});
const history = ref({ sessions: [], travels: [] });
const loading = ref(true);
const dateFilter = ref('all');
const customFrom = ref('');
const customTo = ref('');
const period = ref('day');
const editRate = ref(0);
const savingRate = ref(false);
const rateSaved = ref(false);

const periods = [
  { label: 'ДЕНЬ', val: 'day' },
  { label: 'НЕДЕЛЯ', val: 'week' },
  { label: 'МЕСЯЦ', val: 'month' },
];

const filters = [
  { label: 'ВСЁ', val: 'all' },
  { label: 'ДЕНЬ', val: 'day' },
  { label: 'НЕДЕЛЯ', val: 'week' },
  { label: 'МЕСЯЦ', val: 'month' },
];

const currentStats = computed(() => fullStats.value[period.value] || {});

const timeline = computed(() => {
  const works = (history.value.sessions || []).map(s => ({ ...s, type: 'work' }));
  const travels = (history.value.travels || []).map(t => ({ ...t, type: 'travel' }));
  return [...works, ...travels].sort((a, b) => {
    const da = new Date(a.type === 'work' ? a.arrived_at : a.started_at);
    const db2 = new Date(b.type === 'work' ? b.arrived_at : b.started_at);
    return db2 - da;
  });
});

function fmtDateTime(d) { if (!d) return '—'; return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
function fmtDur(m) {
  if (!m && m !== 0) return '—';
  m = Math.max(0, Math.round(m));
  const h = Math.floor(m / 60), min = m % 60;
  return h > 0 ? `${h}ч ${min}м` : `${min}м`;
}

function getDateRange(filter) {
  const now = new Date();
  if (filter === 'day') return { from: now.toISOString().slice(0,10), to: now.toISOString().slice(0,10) };
  if (filter === 'week') { const f = new Date(now); f.setDate(now.getDate()-7); return { from: f.toISOString().slice(0,10), to: now.toISOString().slice(0,10) }; }
  if (filter === 'month') { const f = new Date(now); f.setMonth(now.getMonth()-1); return { from: f.toISOString().slice(0,10), to: now.toISOString().slice(0,10) }; }
  return {};
}

async function loadHistory(params = {}) {
  const data = await api.get(`/admin/employees/${route.params.id}/history`, { params });
  history.value = data;
}

async function setFilter(val) { dateFilter.value = val; await loadHistory(getDateRange(val)); }
async function applyCustom() {
  dateFilter.value = '';
  const params = {};
  if (customFrom.value) params.from = customFrom.value;
  if (customTo.value) params.to = customTo.value;
  await loadHistory(params);
}

async function saveRate() {
  savingRate.value = true;
  try {
    await api.put(`/admin/employees/${route.params.id}/rate`, { hourly_rate: editRate.value });
    rateSaved.value = true;
    setTimeout(() => rateSaved.value = false, 2000);
    // reload stats
    const statsData = await api.get(`/admin/employees/${route.params.id}/stats`);
    fullStats.value = statsData;
  } catch (e) { console.error(e); }
  finally { savingRate.value = false; }
}

onMounted(async () => {
  loading.value = true;
  const [histData, statsData] = await Promise.all([
    api.get(`/admin/employees/${route.params.id}/history`),
    api.get(`/admin/employees/${route.params.id}/stats`),
  ]);
  employee.value = histData.user;
  history.value = histData;
  fullStats.value = statsData;
  editRate.value = statsData.hourly_rate || 0;
  loading.value = false;
});
</script>

<style scoped>
.page { min-height: 100vh; display: flex; flex-direction: column; background: var(--c-black); }

.header { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-bottom: 1px solid var(--c-700); background: var(--c-900); position: sticky; top: 0; z-index: 100; }
.logo { display: flex; align-items: center; gap: 8px; }
.logo-mark { font-size: 1.2rem; color: var(--accent); }
.logo-text { font-family: var(--font-display); font-weight: 900; font-size: 1rem; letter-spacing: 0.12em; color: var(--c-white); }
.admin-badge { background: var(--accent); color: #000; font-family: var(--font-display); font-size: 0.55rem; font-weight: 900; letter-spacing: 0.12em; padding: 3px 7px; border-radius: 3px; }
.btn-back { background: var(--c-800); border: 1px solid var(--c-600); color: var(--c-300); padding: 6px 14px; border-radius: var(--r); text-decoration: none; font-family: var(--font-display); font-size: 0.65rem; letter-spacing: 0.08em; transition: all 0.15s; }
.btn-back:hover { border-color: var(--accent); color: var(--accent); }

.main { flex: 1; max-width: 800px; margin: 0 auto; width: 100%; padding: 24px 16px; display: flex; flex-direction: column; gap: 20px; }
.loading, .empty { color: var(--c-500); font-size: 0.82rem; padding: 40px; text-align: center; }

.emp-card { display: flex; align-items: flex-start; gap: 16px; background: var(--c-900); border: 1px solid var(--c-700); border-radius: var(--r-lg); padding: 20px; flex-wrap: wrap; }
.emp-avatar { width: 52px; height: 52px; background: var(--accent); color: #000; border-radius: var(--r); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 900; font-size: 1.4rem; flex-shrink: 0; }
.emp-details { flex: 1; }
.emp-name { font-family: var(--font-display); font-size: 1.1rem; font-weight: 700; color: var(--c-white); }
.emp-email { font-size: 0.78rem; color: var(--c-400); margin-top: 4px; }

.rate-block { display: flex; flex-direction: column; gap: 6px; }
.rate-label { font-family: var(--font-display); font-size: 0.6rem; font-weight: 700; letter-spacing: 0.12em; color: var(--c-400); }
.rate-row { display: flex; gap: 8px; align-items: center; }
.rate-input { width: 90px; background: var(--c-800); border: 1px solid var(--c-600); border-radius: var(--r); padding: 7px 10px; color: var(--c-white); font-size: 0.9rem; font-family: var(--font-mono); }
.rate-input:focus { outline: none; border-color: var(--accent); }
.btn-save { background: var(--accent); color: #000; border: none; border-radius: var(--r); padding: 7px 12px; font-family: var(--font-display); font-size: 0.65rem; font-weight: 700; letter-spacing: 0.08em; cursor: pointer; transition: opacity 0.15s; }
.btn-save:hover { opacity: 0.85; }
.btn-save:disabled { opacity: 0.5; }
.rate-ok { font-size: 0.72rem; color: var(--green); }

.period-tabs { display: flex; gap: 4px; }
.ptab { background: var(--c-800); border: 1px solid var(--c-600); color: var(--c-400); padding: 7px 16px; border-radius: var(--r); cursor: pointer; font-family: var(--font-display); font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; transition: all 0.15s; }
.ptab.active { background: var(--c-700); border-color: var(--accent); color: var(--accent); }

.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.stat-card { background: var(--c-900); border: 1px solid var(--c-700); border-radius: var(--r); padding: 16px; }
.stat-card.earn { border-color: rgba(200,255,0,0.2); background: rgba(200,255,0,0.03); }
.stat-label { font-family: var(--font-display); font-size: 0.58rem; font-weight: 700; letter-spacing: 0.12em; color: var(--c-400); margin-bottom: 8px; }
.stat-val { font-family: var(--font-display); font-size: 1.3rem; font-weight: 700; }
.stat-val.work { color: var(--green); }
.stat-val.travel { color: var(--amber); }
.stat-val.accent { color: var(--accent); }

.filters-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.filter-tabs { display: flex; gap: 4px; }
.ftab { background: var(--c-800); border: 1px solid var(--c-600); color: var(--c-400); padding: 5px 10px; border-radius: var(--r); cursor: pointer; font-family: var(--font-display); font-size: 0.6rem; font-weight: 700; letter-spacing: 0.08em; transition: all 0.15s; }
.ftab.active, .ftab:hover { border-color: var(--accent); color: var(--accent); }
.custom-range { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: var(--c-400); }
.date-input { background: var(--c-800); border: 1px solid var(--c-600); border-radius: var(--r); padding: 5px 8px; color: var(--c-200); font-size: 0.78rem; font-family: var(--font-mono); }
.date-input:focus { outline: none; border-color: var(--accent); }
.btn-apply { background: var(--c-700); border: 1px solid var(--c-600); color: var(--c-300); padding: 5px 10px; border-radius: var(--r); cursor: pointer; font-family: var(--font-display); font-size: 0.6rem; transition: all 0.15s; }
.btn-apply:hover { border-color: var(--accent); color: var(--accent); }

.timeline { display: flex; flex-direction: column; gap: 0; }
.timeline-item { display: flex; gap: 14px; padding-bottom: 14px; position: relative; }
.timeline-item:not(:last-child)::before { content: ''; position: absolute; left: 7px; top: 16px; bottom: 0; width: 1px; background: var(--c-700); }
.tl-marker { width: 15px; height: 15px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; border: 2px solid; }
.timeline-item.work .tl-marker { background: var(--green-dim); border-color: var(--green); }
.timeline-item.travel .tl-marker { background: var(--amber-dim); border-color: var(--amber); }
.tl-content { flex: 1; background: var(--c-900); border: 1px solid var(--c-700); border-radius: var(--r); padding: 10px 14px; }
.tl-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.tl-type { font-family: var(--font-display); font-size: 0.6rem; font-weight: 700; letter-spacing: 0.1em; }
.timeline-item.work .tl-type { color: var(--green); }
.timeline-item.travel .tl-type { color: var(--amber); }
.tl-dur { font-size: 0.72rem; color: var(--blue); background: rgba(0,176,255,0.08); padding: 2px 7px; border-radius: 3px; }
.tl-name { font-size: 0.88rem; color: var(--c-white); margin-bottom: 5px; }
.tl-times { display: flex; gap: 8px; align-items: center; font-size: 0.72rem; color: var(--c-400); flex-wrap: wrap; }
.tl-arrow { color: var(--c-600); }

@media (max-width: 500px) {
  .stats-grid { grid-template-columns: 1fr; }
  .header { padding: 12px 16px; }
  .emp-card { flex-direction: column; }
}
</style>
