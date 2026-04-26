<template>
  <div class="page">
    <header class="header">
      <div class="logo"><span class="logo-mark">▣</span><span class="logo-text">TRACKER</span></div>
      <div class="header-right">
        <span class="user-chip">{{ auth.user?.name }}</span>
        <button class="btn-ghost" @click="logout">ВЫЙТИ</button>
      </div>
    </header>

    <main class="main">

      <!-- ACTIVE: ON OBJECT -->
      <div v-if="activeSession" class="card card-work">
        <div class="card-tag tag-work">
          <span class="pulse-dot work-dot"></span>НА ОБЪЕКТЕ
        </div>
        <div class="card-title">{{ activeSession.object_name }}</div>
        <div class="card-sub">прибыл в {{ fmtTime(activeSession.arrived_at) }} · {{ elapsed(activeSession.arrived_at) }}</div>
        <div class="btn-row">
          <button class="btn-action btn-leave" @click="leave" :disabled="actionLoading">
            {{ actionLoading ? '...' : '⬛ ПОКИНУТЬ ОБЪЕКТ' }}
          </button>
          <button class="btn-action btn-endday" @click="confirmEndDay" :disabled="actionLoading">
            ■ ЗАВЕРШИТЬ ДЕНЬ
          </button>
        </div>
      </div>

      <!-- ACTIVE: ON THE ROAD -->
      <div v-else-if="activeTravel" class="card card-travel">
        <div class="card-tag tag-travel">
          <span class="pulse-dot travel-dot"></span>В ДОРОГЕ
        </div>
        <div class="card-title">от: {{ activeTravel.from_object_name || '—' }}</div>
        <div class="card-sub">выехал в {{ fmtTime(activeTravel.started_at) }} · {{ elapsed(activeTravel.started_at) }}</div>

        <div class="arrive-section">
          <div class="field-label">ПРИБЫТЬ НА ОБЪЕКТ</div>
          <select v-model="selectedObject" class="field-select">
            <option value="">— выберите объект —</option>
            <option v-for="o in objects" :key="o.id" :value="o.id">{{ o.name }}</option>
            <option value="new">✏ Новый объект...</option>
          </select>
          <input v-if="selectedObject === 'new'" v-model="newObjectName" type="text" placeholder="Название объекта" class="field-input" />
          <div v-if="formError" class="error-msg">⚠ {{ formError }}</div>
          <div class="btn-row">
            <button class="btn-action btn-arrive" @click="arrive" :disabled="actionLoading">
              {{ actionLoading ? '...' : '▶ ПРИБЫЛ НА ОБЪЕКТ' }}
            </button>
            <button class="btn-action btn-endday" @click="confirmEndDay" :disabled="actionLoading">
              ■ ЗАВЕРШИТЬ ДЕНЬ
            </button>
          </div>
        </div>
      </div>

      <!-- IDLE -->
      <div v-else class="card card-idle">
        <div class="card-tag tag-idle">
          <span class="idle-dot"></span>НЕ НА ОБЪЕКТЕ
        </div>
        <div class="arrive-section">
          <div class="field-label">ВЫБРАТЬ ОБЪЕКТ</div>
          <select v-model="selectedObject" class="field-select">
            <option value="">— выберите объект —</option>
            <option v-for="o in objects" :key="o.id" :value="o.id">{{ o.name }}</option>
            <option value="new">✏ Новый объект...</option>
          </select>
          <input v-if="selectedObject === 'new'" v-model="newObjectName" type="text" placeholder="Название объекта" class="field-input" />
          <div v-if="formError" class="error-msg">⚠ {{ formError }}</div>
          <button class="btn-action btn-arrive" @click="arrive" :disabled="actionLoading">
            {{ actionLoading ? '...' : '▶ ПРИБЫЛ НА ОБЪЕКТ' }}
          </button>
        </div>
      </div>

      <!-- END DAY CONFIRM MODAL -->
      <div v-if="showEndDay" class="modal-overlay" @click.self="showEndDay = false">
        <div class="modal">
          <div class="modal-title">ЗАВЕРШИТЬ РАБОЧИЙ ДЕНЬ?</div>
          <div class="modal-text">
            Все активные записи будут закрыты.<br/>
            Время перестанет начисляться.
          </div>
          <div class="modal-btns">
            <button class="btn-modal btn-cancel" @click="showEndDay = false">ОТМЕНА</button>
            <button class="btn-modal btn-confirm" @click="endDay" :disabled="actionLoading">
              {{ actionLoading ? '...' : 'ЗАВЕРШИТЬ' }}
            </button>
          </div>
        </div>
      </div>

      <!-- STATS -->
      <div class="stats-row">
        <div class="stat-card" v-for="p in statPeriods" :key="p.key">
          <div class="stat-period">{{ p.label }}</div>
          <div class="stat-line">
            <span class="stat-k">Работа</span>
            <span class="stat-v sv-work">{{ fmtDur(stats[p.key]?.work_minutes) }}</span>
          </div>
          <div class="stat-line">
            <span class="stat-k">Дорога</span>
            <span class="stat-v sv-travel">{{ fmtDur(stats[p.key]?.travel_minutes) }}</span>
          </div>
          <div class="stat-earn">{{ stats[p.key]?.earnings || '0.00' }} €</div>
        </div>
      </div>

      <!-- HISTORY -->
      <div class="history-section">
        <div class="section-header">
          <span class="section-label">ИСТОРИЯ</span>
          <div class="filter-row">
            <button v-for="f in filters" :key="f.val" :class="['ftab', { active: dateFilter === f.val }]" @click="setFilter(f.val)">{{ f.label }}</button>
          </div>
        </div>

        <div v-if="histLoading" class="info-text">загрузка...</div>
        <div v-else-if="!timeline.length" class="info-text">нет записей</div>
        <div v-else class="timeline">
          <div v-for="item in timeline" :key="item.type + item.id" :class="['tl-item', item.type]">
            <div class="tl-dot"></div>
            <div class="tl-body">
              <div class="tl-top">
                <span class="tl-label">{{ item.type === 'work' ? '🏗 РАБОТА' : '🚗 ДОРОГА' }}</span>
                <span class="tl-dur">{{ fmtDur(item.duration_minutes) }}</span>
              </div>
              <div class="tl-name">{{ item.type === 'work' ? item.object_name : `от: ${item.from_object_name || '—'}` }}</div>
              <div class="tl-time">
                {{ fmtDateTime(item.type === 'work' ? item.arrived_at : item.started_at) }}
                <span class="tl-sep">→</span>
                {{ (item.type === 'work' ? item.left_at : item.ended_at) ? fmtDateTime(item.type === 'work' ? item.left_at : item.ended_at) : '—' }}
              </div>
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
const showEndDay = ref(false);
const history = ref({ sessions: [], travels: [] });
const stats = ref({ day: {}, week: {}, month: {} });
const histLoading = ref(false);
const dateFilter = ref('all');
let timer = null;
const tick = ref(0);

const statPeriods = [
  { key: 'day', label: 'СЕГОДНЯ' },
  { key: 'week', label: 'НЕДЕЛЯ' },
  { key: 'month', label: 'МЕСЯЦ' },
];

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

function confirmEndDay() { showEndDay.value = true; }

async function endDay() {
  actionLoading.value = true;
  try {
    await api.post('/sessions/end-day');
    activeSession.value = null;
    activeTravel.value = null;
    showEndDay.value = false;
    await loadHistory(); await loadStats();
  } catch (e) { console.error(e); }
  finally { actionLoading.value = false; }
}

function logout() { auth.logout(); router.push('/auth'); }

onMounted(async () => {
  const [curr, objs] = await Promise.all([api.get('/sessions/current'), api.get('/objects')]);
  activeSession.value = curr.session;
  activeTravel.value = curr.travel;
  objects.value = objs.objects;
  await loadHistory();
  await loadStats();
  timer = setInterval(() => { tick.value++; }, 30000);
});

onUnmounted(() => clearInterval(timer));
</script>

<style scoped>
.page { min-height: 100vh; display: flex; flex-direction: column; background: #0c0c0c; }

.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 22px; border-bottom: 1px solid #1e1e1e;
  background: #111; position: sticky; top: 0; z-index: 100;
}
.logo { display: flex; align-items: center; gap: 8px; }
.logo-mark { font-size: 1.1rem; color: #c8ff00; }
.logo-text { font-family: 'Unbounded', sans-serif; font-weight: 900; font-size: 0.95rem; letter-spacing: 0.14em; color: #f0f0f0; }
.header-right { display: flex; align-items: center; gap: 10px; }
.user-chip { background: #1a1a1a; border: 1px solid #2a2a2a; color: #777; padding: 4px 12px; border-radius: 4px; font-size: 0.76rem; }
.btn-ghost { background: transparent; border: 1px solid #2a2a2a; color: #555; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 0.7rem; font-family: 'Unbounded', sans-serif; letter-spacing: 0.08em; transition: all 0.15s; }
.btn-ghost:hover { border-color: #ff4444; color: #ff4444; }

.main { flex: 1; max-width: 660px; margin: 0 auto; width: 100%; padding: 20px 16px; display: flex; flex-direction: column; gap: 16px; }

/* Cards */
.card { border-radius: 8px; padding: 22px; border: 1px solid #1e1e1e; background: #131313; }
.card-work { border-color: #1a3a1a; background: linear-gradient(135deg, #0f1f0f, #131313); }
.card-travel { border-color: #2d2200; background: linear-gradient(135deg, #1a1400, #131313); }
.card-idle { border-color: #1e1e1e; }

.card-tag { display: flex; align-items: center; gap: 7px; font-family: 'Unbounded', sans-serif; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.14em; margin-bottom: 12px; }
.tag-work { color: #4caf50; }
.tag-travel { color: #ffa000; }
.tag-idle { color: #444; }

.pulse-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.work-dot { background: #4caf50; box-shadow: 0 0 6px #4caf50; animation: pulse 2s infinite; }
.travel-dot { background: #ffa000; box-shadow: 0 0 6px #ffa000; animation: pulse 2s infinite; }
.idle-dot { width: 7px; height: 7px; border-radius: 50%; background: #333; flex-shrink: 0; }
@keyframes pulse { 0%,100%{opacity:1}50%{opacity:.35} }

.card-title { font-family: 'Unbounded', sans-serif; font-size: 1.15rem; font-weight: 700; color: #e8e8e8; margin-bottom: 5px; }
.card-sub { font-size: 0.76rem; color: #444; margin-bottom: 18px; }

.arrive-section { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
.field-label { font-family: 'Unbounded', sans-serif; font-size: 0.58rem; font-weight: 700; letter-spacing: 0.14em; color: #444; }
.field-select, .field-input {
  width: 100%; background: #1a1a1a; border: 1px solid #2a2a2a;
  border-radius: 5px; padding: 10px 13px; color: #ccc;
  font-size: 0.86rem; appearance: none; transition: border-color 0.15s;
  font-family: 'JetBrains Mono', monospace;
}
.field-select:focus, .field-input:focus { outline: none; border-color: #444; }
.field-input::placeholder { color: #333; }

.error-msg { background: rgba(255,60,60,0.08); border: 1px solid rgba(255,60,60,0.3); color: #ff5555; padding: 8px 12px; border-radius: 5px; font-size: 0.78rem; }

.btn-row { display: flex; gap: 8px; }
.btn-action {
  flex: 1; padding: 12px 10px; border: none; border-radius: 5px;
  font-family: 'Unbounded', sans-serif; font-size: 0.68rem; font-weight: 700;
  letter-spacing: 0.08em; cursor: pointer; transition: all 0.15s;
}
.btn-action:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-arrive {
  background: linear-gradient(135deg, #2a3a1a, #1e2e12);
  border: 1px solid #3a5a1a; color: #8bc34a;
}
.btn-arrive:hover:not(:disabled) { background: linear-gradient(135deg, #3a5a1a, #2a4412); border-color: #5a8a2a; }

.btn-leave {
  background: linear-gradient(135deg, #2a1a1a, #1e1212);
  border: 1px solid #4a2020; color: #e57373;
}
.btn-leave:hover:not(:disabled) { background: linear-gradient(135deg, #3a2020, #2a1818); }

.btn-endday {
  background: linear-gradient(135deg, #1e1e1e, #161616);
  border: 1px solid #333; color: #666;
}
.btn-endday:hover:not(:disabled) { border-color: #555; color: #999; }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.85);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal {
  background: #141414; border: 1px solid #2a2a2a; border-radius: 8px;
  padding: 28px; max-width: 340px; width: 90%;
}
.modal-title { font-family: 'Unbounded', sans-serif; font-size: 0.85rem; font-weight: 700; color: #e0e0e0; margin-bottom: 12px; }
.modal-text { font-size: 0.82rem; color: #555; line-height: 1.6; margin-bottom: 22px; }
.modal-btns { display: flex; gap: 10px; }
.btn-modal { flex: 1; padding: 11px; border: none; border-radius: 5px; font-family: 'Unbounded', sans-serif; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; cursor: pointer; transition: all 0.15s; }
.btn-modal:disabled { opacity: 0.4; }
.btn-cancel { background: #1e1e1e; border: 1px solid #2a2a2a; color: #555; }
.btn-cancel:hover { border-color: #444; color: #888; }
.btn-confirm { background: linear-gradient(135deg, #2a1a1a, #1e1212); border: 1px solid #4a2020; color: #e57373; }
.btn-confirm:hover:not(:disabled) { background: linear-gradient(135deg, #3a2020, #2a1818); }

/* Stats */
.stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.stat-card { background: #111; border: 1px solid #1e1e1e; border-radius: 7px; padding: 14px; }
.stat-period { font-family: 'Unbounded', sans-serif; font-size: 0.55rem; font-weight: 700; letter-spacing: 0.14em; color: #333; margin-bottom: 10px; }
.stat-line { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; }
.stat-k { font-size: 0.7rem; color: #3a3a3a; }
.stat-v { font-size: 0.75rem; font-weight: 700; }
.sv-work { color: #4caf50; }
.sv-travel { color: #ffa000; }
.stat-earn { font-family: 'Unbounded', sans-serif; font-size: 1rem; font-weight: 700; color: #c8ff00; margin-top: 8px; border-top: 1px solid #1a1a1a; padding-top: 7px; }

/* History */
.history-section { display: flex; flex-direction: column; gap: 12px; }
.section-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.section-label { font-family: 'Unbounded', sans-serif; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.14em; color: #333; }
.filter-row { display: flex; gap: 4px; }
.ftab { background: #111; border: 1px solid #1e1e1e; color: #333; padding: 4px 9px; border-radius: 4px; cursor: pointer; font-family: 'Unbounded', sans-serif; font-size: 0.58rem; font-weight: 700; letter-spacing: 0.08em; transition: all 0.15s; }
.ftab.active, .ftab:hover { border-color: #333; color: #777; background: #161616; }
.info-text { color: #333; font-size: 0.8rem; text-align: center; padding: 20px; }

.timeline { display: flex; flex-direction: column; }
.tl-item { display: flex; gap: 12px; padding-bottom: 12px; position: relative; }
.tl-item:not(:last-child)::before { content: ''; position: absolute; left: 6px; top: 14px; bottom: 0; width: 1px; background: #1a1a1a; }
.tl-dot { width: 13px; height: 13px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; border: 2px solid; }
.tl-item.work .tl-dot { background: rgba(76,175,80,0.1); border-color: #4caf50; }
.tl-item.travel .tl-dot { background: rgba(255,160,0,0.1); border-color: #ffa000; }
.tl-body { flex: 1; background: #111; border: 1px solid #1a1a1a; border-radius: 5px; padding: 10px 12px; }
.tl-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.tl-label { font-family: 'Unbounded', sans-serif; font-size: 0.58rem; font-weight: 700; letter-spacing: 0.1em; }
.tl-item.work .tl-label { color: #4caf50; }
.tl-item.travel .tl-label { color: #ffa000; }
.tl-dur { font-size: 0.7rem; color: #5a7a9a; background: rgba(90,120,154,0.1); padding: 2px 6px; border-radius: 3px; }
.tl-name { font-size: 0.86rem; color: #ccc; margin-bottom: 4px; }
.tl-time { font-size: 0.7rem; color: #333; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.tl-sep { color: #222; }

@media (max-width: 480px) {
  .stats-row { grid-template-columns: 1fr; }
  .btn-row { flex-direction: column; }
  .header { padding: 12px 14px; }
}
</style>
