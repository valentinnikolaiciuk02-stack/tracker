<template>
  <div class="page">
    <header class="header">
      <div class="logo"><span class="logo-mark">▣</span><span class="logo-text">TRACKER</span></div>
      <div class="header-right">
        <span class="user-chip">{{ auth.user?.name }}</span>
        <button class="btn-logout" @click="logout">ВЫЙТИ</button>
      </div>
    </header>

    <main class="main">
      <!-- STATUS BLOCK -->
      <div v-if="activeSession" class="status-block status-work">
        <div class="status-row">
          <div class="status-indicator work"></div>
          <span class="status-label">НА ОБЪЕКТЕ</span>
        </div>
        <div class="status-object">{{ activeSession.object_name }}</div>
        <div class="status-since">с {{ fmtTime(activeSession.arrived_at) }} · {{ elapsed(activeSession.arrived_at) }}</div>
        <button class="btn-action btn-red" @click="leave" :disabled="actionLoading">
          {{ actionLoading ? '...' : '⬛ ПОКИНУТЬ ОБЪЕКТ' }}
        </button>
      </div>

      <div v-else-if="activeTravel" class="status-block status-travel">
        <div class="status-row">
          <div class="status-indicator travel"></div>
          <span class="status-label">В ДОРОГЕ</span>
        </div>
        <div class="status-object">от: {{ activeTravel.from_object_name || 'объект' }}</div>
        <div class="status-since">с {{ fmtTime(activeTravel.started_at) }} · {{ elapsed(activeTravel.started_at) }}</div>

        <div class="arrive-form">
          <label class="field-label">ПРИБЫТЬ НА ОБЪЕКТ</label>
          <select v-model="selectedObject" class="field-select">
            <option value="">— выберите объект —</option>
            <option v-for="o in objects" :key="o.id" :value="o.id">{{ o.name }}</option>
            <option value="new">✏ Новый объект...</option>
          </select>
          <input v-if="selectedObject === 'new'" v-model="newObjectName" type="text" placeholder="Название объекта" class="field-input" />
          <div v-if="formError" class="error-msg">⚠ {{ formError }}</div>
          <button class="btn-action btn-green" @click="arrive" :disabled="actionLoading">
            {{ actionLoading ? '...' : '▶ ПРИБЫЛ НА ОБЪЕКТ' }}
          </button>
        </div>
      </div>

      <div v-else class="status-block status-idle">
        <div class="status-row">
          <div class="status-indicator idle"></div>
          <span class="status-label">НЕ НА ОБЪЕКТЕ</span>
        </div>
        <div class="arrive-form">
          <label class="field-label">ВЫБРАТЬ ОБЪЕКТ</label>
          <select v-model="selectedObject" class="field-select">
            <option value="">— выберите объект —</option>
            <option v-for="o in objects" :key="o.id" :value="o.id">{{ o.name }}</option>
            <option value="new">✏ Новый объект...</option>
          </select>
          <input v-if="selectedObject === 'new'" v-model="newObjectName" type="text" placeholder="Название объекта" class="field-input" />
          <div v-if="formError" class="error-msg">⚠ {{ formError }}</div>
          <button class="btn-action btn-green" @click="arrive" :disabled="actionLoading">
            {{ actionLoading ? '...' : '▶ ПРИБЫЛ НА ОБЪЕКТ' }}
          </button>
        </div>
      </div>

      <!-- STATS -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-period">СЕГОДНЯ</div>
          <div class="stat-row"><span class="stat-k">Работа</span><span class="stat-v work">{{ fmtDur(stats.day?.work_minutes) }}</span></div>
          <div class="stat-row"><span class="stat-k">Дорога</span><span class="stat-v travel">{{ fmtDur(stats.day?.travel_minutes) }}</span></div>
          <div class="stat-earn">{{ stats.day?.earnings }} €</div>
        </div>
        <div class="stat-card">
          <div class="stat-period">НЕДЕЛЯ</div>
          <div class="stat-row"><span class="stat-k">Работа</span><span class="stat-v work">{{ fmtDur(stats.week?.work_minutes) }}</span></div>
          <div class="stat-row"><span class="stat-k">Дорога</span><span class="stat-v travel">{{ fmtDur(stats.week?.travel_minutes) }}</span></div>
          <div class="stat-earn">{{ stats.week?.earnings }} €</div>
        </div>
        <div class="stat-card">
          <div class="stat-period">МЕСЯЦ</div>
          <div class="stat-row"><span class="stat-k">Работа</span><span class="stat-v work">{{ fmtDur(stats.month?.work_minutes) }}</span></div>
          <div class="stat-row"><span class="stat-k">Дорога</span><span class="stat-v travel">{{ fmtDur(stats.month?.travel_minutes) }}</span></div>
          <div class="stat-earn">{{ stats.month?.earnings }} €</div>
        </div>
      </div>

      <!-- HISTORY -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">ИСТОРИЯ</span>
          <div class="filter-tabs">
            <button v-for="f in filters" :key="f.val" :class="['ftab', { active: dateFilter === f.val }]" @click="setFilter(f.val)">{{ f.label }}</button>
          </div>
        </div>

        <div v-if="histLoading" class="loading">загрузка...</div>
        <div v-else-if="!timeline.length" class="empty">нет записей</div>
        <div v-else class="timeline">
          <div v-for="item in timeline" :key="item.type + item.id" :class="['timeline-item', item.type]">
            <div class="tl-marker"></div>
            <div class="tl-content">
              <div class="tl-type">{{ item.type === 'work' ? '🏗 РАБОТА' : '🚗 ДОРОГА' }}</div>
              <div class="tl-name">{{ item.type === 'work' ? item.object_name : `от: ${item.from_object_name || '—'}` }}</div>
              <div class="tl-times">
                <span>{{ fmtDateTime(item.type === 'work' ? item.arrived_at : item.started_at) }}</span>
                <span class="tl-arrow">→</span>
                <span>{{ (item.type === 'work' ? item.left_at : item.ended_at) ? fmtDateTime(item.type === 'work' ? item.left_at : item.ended_at) : '<span class="tl-active">сейчас</span>' }}</span>
              </div>
              <div class="tl-dur">⏱ {{ fmtDur(item.duration_minutes) }}</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import api from '../lib/api.js';

const auth = useAuthStore();
const router = useRouter();

const activeSession = ref(null);
const activeTravel = ref(null);
const objects = ref([]);
const selectedObject = ref('');
const newObjectName = ref('');
const formError = ref('');
const actionLoading = ref(false);
const history = ref({ sessions: [], travels: [] });
const stats = ref({ day: {}, week: {}, month: {} });
const histLoading = ref(false);
const dateFilter = ref('all');
let timer = null;
const tick = ref(0);

const filters = [
  { label: 'ВСЁ', val: 'all' },
  { label: 'ДЕНЬ', val: 'day' },
  { label: 'НЕДЕЛЯ', val: 'week' },
  { label: 'МЕСЯЦ', val: 'month' },
];

const timeline = computed(() => {
  const works = (history.value.sessions || []).map(s => ({ ...s, type: 'work' }));
  const travels = (history.value.travels || []).map(t => ({ ...t, type: 'travel' }));
  return [...works, ...travels].sort((a, b) => {
    const da = new Date(a.type === 'work' ? a.arrived_at : a.started_at);
    const db2 = new Date(b.type === 'work' ? b.arrived_at : b.started_at);
    return db2 - da;
  });
});

function fmtTime(d) { if (!d) return '—'; return new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); }
function fmtDateTime(d) { if (!d) return '—'; return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
function fmtDur(m) {
  if (!m && m !== 0) return '—';
  m = Math.max(0, Math.round(m));
  const h = Math.floor(m / 60), min = m % 60;
  return h > 0 ? `${h}ч ${min}м` : `${min}м`;
}
function elapsed(d) {
  tick.value;
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d)) / 60000);
  return fmtDur(diff);
}

function getDateRange(filter) {
  const now = new Date();
  if (filter === 'day') return { from: now.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
  if (filter === 'week') { const f = new Date(now); f.setDate(now.getDate() - 7); return { from: f.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) }; }
  if (filter === 'month') { const f = new Date(now); f.setMonth(now.getMonth() - 1); return { from: f.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) }; }
  return {};
}

async function loadHistory() {
  histLoading.value = true;
  const data = await api.get('/sessions/history', { params: getDateRange(dateFilter.value) });
  history.value = data;
  histLoading.value = false;
}

async function loadStats() {
  const data = await api.get('/sessions/stats');
  stats.value = data;
}

async function setFilter(val) { dateFilter.value = val; await loadHistory(); }

async function arrive() {
  formError.value = '';
  let objectId = selectedObject.value;
  if (!objectId) { formError.value = 'Выберите объект'; return; }
  actionLoading.value = true;
  try {
    if (objectId === 'new') {
      if (!newObjectName.value.trim()) { formError.value = 'Введите название'; actionLoading.value = false; return; }
      const d = await api.post('/objects', { name: newObjectName.value.trim() });
      objectId = d.object.id;
      if (!objects.value.find(o => o.id === d.object.id)) objects.value.push(d.object);
    }
    const data = await api.post('/sessions/arrive', { object_id: objectId });
    activeSession.value = data.session;
    activeTravel.value = null;
    selectedObject.value = ''; newObjectName.value = '';
    await loadHistory(); await loadStats();
  } catch (e) { formError.value = typeof e === 'string' ? e : 'Ошибка'; }
  finally { actionLoading.value = false; }
}

async function leave() {
  actionLoading.value = true;
  try {
    const data = await api.post('/sessions/leave');
    activeSession.value = null;
    activeTravel.value = data.travel;
    await loadHistory(); await loadStats();
  } catch (e) { console.error(e); }
  finally { actionLoading.value = false; }
}

function logout() { auth.logout(); router.push('/auth'); }

onMounted(async () => {
  const [sess, objs] = await Promise.all([api.get('/sessions/current'), api.get('/objects')]);
  activeSession.value = sess.session;
  objects.value = objs.objects;

  // Check for active travel
  try {
    const hist = await api.get('/sessions/history', { params: { from: new Date().toISOString().slice(0,10), to: new Date().toISOString().slice(0,10) } });
    const activeTrav = (hist.travels || []).find(t => t.status === 'active');
    if (!activeSession.value && activeTrav) activeTravel.value = activeTrav;
  } catch {}

  await loadHistory();
  await loadStats();

  timer = setInterval(() => { tick.value++; }, 30000);
});

onUnmounted(() => clearInterval(timer));
</script>

<style scoped>
.page { min-height: 100vh; display: flex; flex-direction: column; background: var(--c-black); }

.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 24px; border-bottom: 1px solid var(--c-700);
  background: var(--c-900); position: sticky; top: 0; z-index: 100;
}
.logo { display: flex; align-items: center; gap: 8px; }
.logo-mark { font-size: 1.2rem; color: var(--accent); }
.logo-text { font-family: var(--font-display); font-weight: 900; font-size: 1rem; letter-spacing: 0.12em; color: var(--c-white); }
.header-right { display: flex; align-items: center; gap: 10px; }
.user-chip { background: var(--c-700); color: var(--c-300); padding: 5px 12px; border-radius: var(--r); font-size: 0.78rem; }
.btn-logout { background: transparent; border: 1px solid var(--c-600); color: var(--c-400); padding: 5px 12px; border-radius: var(--r); cursor: pointer; font-size: 0.72rem; font-family: var(--font-display); letter-spacing: 0.08em; transition: all 0.15s; }
.btn-logout:hover { border-color: var(--red); color: var(--red); }

.main { flex: 1; max-width: 680px; margin: 0 auto; width: 100%; padding: 24px 16px; display: flex; flex-direction: column; gap: 20px; }

/* Status blocks */
.status-block { border-radius: var(--r-lg); padding: 24px; border: 1px solid var(--c-600); background: var(--c-900); }
.status-work { border-color: rgba(0,230,118,0.3); background: linear-gradient(135deg, rgba(0,230,118,0.04), var(--c-900)); }
.status-travel { border-color: rgba(255,171,0,0.3); background: linear-gradient(135deg, rgba(255,171,0,0.04), var(--c-900)); }
.status-idle { border-color: var(--c-600); }

.status-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.status-indicator { width: 8px; height: 8px; border-radius: 50%; }
.status-indicator.work { background: var(--green); box-shadow: 0 0 8px var(--green); animation: pulse 2s infinite; }
.status-indicator.travel { background: var(--amber); box-shadow: 0 0 8px var(--amber); animation: pulse 2s infinite; }
.status-indicator.idle { background: var(--c-500); }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

.status-label { font-family: var(--font-display); font-size: 0.65rem; font-weight: 700; letter-spacing: 0.15em; color: var(--c-400); }
.status-object { font-family: var(--font-display); font-size: 1.2rem; font-weight: 700; color: var(--c-white); margin-bottom: 6px; }
.status-since { font-size: 0.78rem; color: var(--c-400); margin-bottom: 20px; }

.arrive-form { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
.field-label { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.12em; color: var(--c-400); }
.field-select, .field-input {
  width: 100%; background: var(--c-800); border: 1px solid var(--c-600);
  border-radius: var(--r); padding: 11px 14px; color: var(--c-100);
  font-size: 0.88rem; appearance: none; transition: border-color 0.15s;
}
.field-select:focus, .field-input:focus { outline: none; border-color: var(--accent); }
.field-input::placeholder { color: var(--c-500); }

.error-msg { background: var(--red-dim); border: 1px solid var(--red); color: var(--red); padding: 8px 12px; border-radius: var(--r); font-size: 0.8rem; }

.btn-action {
  width: 100%; padding: 13px; border: none; border-radius: var(--r);
  font-family: var(--font-display); font-size: 0.75rem; font-weight: 700;
  letter-spacing: 0.1em; cursor: pointer; transition: all 0.15s;
}
.btn-action:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-green { background: var(--green); color: #000; }
.btn-green:hover:not(:disabled) { background: #00f588; transform: translateY(-1px); }
.btn-red { background: var(--red); color: #fff; }
.btn-red:hover:not(:disabled) { background: #ff5555; transform: translateY(-1px); }

/* Stats */
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.stat-card { background: var(--c-900); border: 1px solid var(--c-700); border-radius: var(--r-lg); padding: 16px; }
.stat-period { font-family: var(--font-display); font-size: 0.6rem; font-weight: 700; letter-spacing: 0.15em; color: var(--c-400); margin-bottom: 12px; }
.stat-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.stat-k { font-size: 0.72rem; color: var(--c-400); }
.stat-v { font-size: 0.78rem; font-weight: 700; }
.stat-v.work { color: var(--green); }
.stat-v.travel { color: var(--amber); }
.stat-earn { font-family: var(--font-display); font-size: 1.1rem; font-weight: 700; color: var(--accent); margin-top: 10px; border-top: 1px solid var(--c-700); padding-top: 8px; }

/* History */
.section { display: flex; flex-direction: column; gap: 14px; }
.section-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
.section-title { font-family: var(--font-display); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.15em; color: var(--c-400); }
.filter-tabs { display: flex; gap: 4px; }
.ftab { background: var(--c-800); border: 1px solid var(--c-600); color: var(--c-400); padding: 5px 10px; border-radius: var(--r); cursor: pointer; font-family: var(--font-display); font-size: 0.6rem; font-weight: 700; letter-spacing: 0.08em; transition: all 0.15s; }
.ftab.active, .ftab:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }

.loading, .empty { color: var(--c-500); font-size: 0.82rem; padding: 24px; text-align: center; }

.timeline { display: flex; flex-direction: column; gap: 0; }
.timeline-item { display: flex; gap: 14px; padding-bottom: 16px; position: relative; }
.timeline-item:not(:last-child)::before { content: ''; position: absolute; left: 7px; top: 16px; bottom: 0; width: 1px; background: var(--c-700); }
.tl-marker { width: 15px; height: 15px; border-radius: 50%; flex-shrink: 0; margin-top: 2px; border: 2px solid; }
.timeline-item.work .tl-marker { background: var(--green-dim); border-color: var(--green); }
.timeline-item.travel .tl-marker { background: var(--amber-dim); border-color: var(--amber); }
.tl-content { flex: 1; background: var(--c-900); border: 1px solid var(--c-700); border-radius: var(--r); padding: 12px 14px; }
.tl-type { font-family: var(--font-display); font-size: 0.6rem; font-weight: 700; letter-spacing: 0.12em; margin-bottom: 4px; }
.timeline-item.work .tl-type { color: var(--green); }
.timeline-item.travel .tl-type { color: var(--amber); }
.tl-name { font-size: 0.9rem; color: var(--c-white); margin-bottom: 6px; font-weight: 500; }
.tl-times { font-size: 0.75rem; color: var(--c-400); display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.tl-arrow { color: var(--c-600); }
.tl-active { color: var(--green); }
.tl-dur { font-size: 0.72rem; color: var(--blue); margin-top: 4px; }

@media (max-width: 500px) {
  .stats-grid { grid-template-columns: 1fr; }
  .header { padding: 12px 16px; }
}
</style>
