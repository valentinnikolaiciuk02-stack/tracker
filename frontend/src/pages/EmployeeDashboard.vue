<template>
  <div class="page">
    <header class="header">
      <div class="logo">
        <span class="logo-icon">◈</span>
        <span class="logo-name">TRACKER</span>
      </div>
      <div class="header-right">
        <span class="user-badge">👤 {{ auth.user?.name }}</span>
        <button class="btn-icon" @click="logout">Выйти</button>
      </div>
    </header>

    <main class="main">
      <!-- ACTIVE SESSION -->
      <div v-if="activeSession" class="status-card active-card">
        <div class="status-tag tag-active">🟢 На объекте</div>
        <h2 class="status-object">{{ activeSession.object_name }}</h2>
        <p class="status-time">Прибыл: {{ fmtDate(activeSession.arrived_at) }}</p>
        <button class="btn-action btn-leave" @click="leave" :disabled="actionLoading">
          <span v-if="actionLoading" class="spinner-w"></span>
          <span v-else>🚪 Покинуть объект</span>
        </button>
      </div>

      <!-- IDLE - ARRIVE FORM -->
      <div v-else class="status-card idle-card">
        <div class="status-tag tag-idle">⚪ Не на объекте</div>
        <h2 class="form-title">Прибыть на объект</h2>

        <div class="field">
          <label>Выберите объект</label>
          <select v-model="selectedObject" class="field-select">
            <option value="">— выберите объект —</option>
            <option v-for="o in objects" :key="o.id" :value="o.id">{{ o.name }}</option>
            <option value="new">✏️ Новый объект...</option>
          </select>
        </div>

        <div v-if="selectedObject === 'new'" class="field">
          <label>Название нового объекта</label>
          <input v-model="newObjectName" type="text" placeholder="Например: Склад Б" class="field-input" />
        </div>

        <div v-if="formError" class="error-box">{{ formError }}</div>
        <button class="btn-action btn-arrive" @click="arrive" :disabled="actionLoading">
          <span v-if="actionLoading" class="spinner-w"></span>
          <span v-else>✅ Я прибыл на объект</span>
        </button>
      </div>

      <!-- HISTORY -->
      <div class="section">
        <div class="section-header">
          <h3>История перемещений</h3>
          <div class="date-filters">
            <button v-for="f in filters" :key="f.val" :class="['filter-btn', { active: dateFilter === f.val }]" @click="setFilter(f.val)">{{ f.label }}</button>
          </div>
        </div>

        <div v-if="histLoading" class="loading">Загрузка...</div>
        <div v-else-if="!history.length" class="empty">Записей нет за выбранный период</div>
        <div v-else class="history-list">
          <div v-for="s in history" :key="s.id" class="hist-row">
            <div class="hist-obj">📍 {{ s.object_name }}</div>
            <div class="hist-times">
              <span class="time-arrive">🟢 {{ fmtDate(s.arrived_at) }}</span>
              <span v-if="s.left_at" class="time-leave">🔴 {{ fmtDate(s.left_at) }}</span>
              <span v-else class="time-active">⏳ Ещё на объекте</span>
            </div>
            <div v-if="s.left_at" class="hist-dur">⏱ {{ duration(s.arrived_at, s.left_at) }}</div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import api from '../lib/api.js';

const auth = useAuthStore();
const router = useRouter();

const activeSession = ref(null);
const objects = ref([]);
const selectedObject = ref('');
const newObjectName = ref('');
const formError = ref('');
const actionLoading = ref(false);
const history = ref([]);
const histLoading = ref(false);
const dateFilter = ref('all');

const filters = [
  { label: 'Всё', val: 'all' },
  { label: 'Сегодня', val: 'day' },
  { label: 'Неделя', val: 'week' },
  { label: 'Месяц', val: 'month' },
];

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function duration(a, b) {
  const diff = Math.floor((new Date(b) - new Date(a)) / 60000);
  const h = Math.floor(diff / 60), m = diff % 60;
  return h > 0 ? `${h}ч ${m}м` : `${m}м`;
}

function getDateRange(filter) {
  const now = new Date();
  if (filter === 'day') return { from: now.toISOString().slice(0,10), to: now.toISOString().slice(0,10) };
  if (filter === 'week') {
    const from = new Date(now); from.setDate(now.getDate() - 7);
    return { from: from.toISOString().slice(0,10), to: now.toISOString().slice(0,10) };
  }
  if (filter === 'month') {
    const from = new Date(now); from.setMonth(now.getMonth() - 1);
    return { from: from.toISOString().slice(0,10), to: now.toISOString().slice(0,10) };
  }
  return {};
}

async function loadHistory() {
  histLoading.value = true;
  try {
    const data = await api.get('/sessions/history', { params: getDateRange(dateFilter.value) });
    history.value = data.sessions;
  } finally {
    histLoading.value = false;
  }
}

async function setFilter(val) {
  dateFilter.value = val;
  await loadHistory();
}

async function arrive() {
  formError.value = '';
  let objectId = selectedObject.value;
  if (!objectId) { formError.value = 'Выберите объект'; return; }

  actionLoading.value = true;
  try {
    if (objectId === 'new') {
      if (!newObjectName.value.trim()) { formError.value = 'Введите название объекта'; actionLoading.value = false; return; }
      const d = await api.post('/objects', { name: newObjectName.value.trim() });
      objectId = d.object.id;
      if (!objects.value.find(o => o.id === d.object.id)) objects.value.push(d.object);
    }
    const data = await api.post('/sessions/arrive', { object_id: objectId });
    activeSession.value = data.session;
    selectedObject.value = '';
    newObjectName.value = '';
    await loadHistory();
  } catch (e) {
    formError.value = typeof e === 'string' ? e : 'Ошибка';
  } finally {
    actionLoading.value = false;
  }
}

async function leave() {
  actionLoading.value = true;
  try {
    await api.post('/sessions/leave');
    activeSession.value = null;
    await loadHistory();
  } catch (e) {
    console.error(e);
  } finally {
    actionLoading.value = false;
  }
}

function logout() {
  auth.logout();
  router.push('/auth');
}

onMounted(async () => {
  const [sess, objs] = await Promise.all([api.get('/sessions/current'), api.get('/objects')]);
  activeSession.value = sess.session;
  objects.value = objs.objects;
  await loadHistory();
});
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
.header-right { display: flex; align-items: center; gap: 12px; }
.user-badge { background: var(--surface2); border: 1px solid var(--border); padding: 6px 14px; border-radius: 8px; font-size: 0.88rem; color: var(--muted2); }
.btn-icon { background: transparent; border: 1px solid var(--border); color: var(--muted); padding: 6px 14px; border-radius: 8px; cursor: pointer; font-size: 0.88rem; transition: all 0.2s; }
.btn-icon:hover { border-color: var(--red); color: var(--red); }

.main { flex: 1; max-width: 700px; margin: 0 auto; width: 100%; padding: 32px 24px; display: flex; flex-direction: column; gap: 28px; }

.status-card { border-radius: var(--radius); padding: 28px; border: 1px solid var(--border); }
.active-card { background: linear-gradient(135deg, rgba(0,229,160,0.05), rgba(0,229,160,0.02)); border-color: rgba(0,229,160,0.25); }
.idle-card { background: var(--surface); display: flex; flex-direction: column; gap: 14px; }

.status-tag { display: inline-block; padding: 5px 12px; border-radius: 999px; font-size: 0.8rem; font-weight: 600; margin-bottom: 12px; }
.tag-active { background: var(--green-dim); color: var(--green); border: 1px solid rgba(0,229,160,0.3); }
.tag-idle { background: var(--surface2); color: var(--muted); border: 1px solid var(--border); }

.status-object { font-size: 1.5rem; margin-bottom: 8px; }
.status-time { color: var(--muted2); font-size: 0.9rem; margin-bottom: 20px; }
.form-title { font-size: 1.1rem; font-weight: 700; }

.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 0.78rem; font-weight: 500; color: var(--muted2); text-transform: uppercase; letter-spacing: 0.08em; }
.field-select, .field-input {
  width: 100%; background: var(--surface2); border: 1px solid var(--border);
  border-radius: 10px; padding: 12px 16px; color: var(--text); font-size: 0.95rem;
  transition: border-color 0.2s; appearance: none;
}
.field-select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%236b72a0' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 40px; }
.field-select:focus, .field-input:focus { outline: none; border-color: var(--accent); }
.field-input::placeholder { color: var(--muted); }
.field-select option { background: var(--surface2); }

.error-box { background: var(--red-dim); border: 1px solid rgba(255,77,109,0.3); color: var(--red); padding: 10px 14px; border-radius: 8px; font-size: 0.88rem; }

.btn-action { border: none; border-radius: 12px; padding: 14px 24px; font-family: var(--font-display); font-size: 1rem; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; }
.btn-action:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-arrive { background: var(--accent); color: #000; }
.btn-arrive:hover:not(:disabled) { opacity: 0.9; }
.btn-leave { background: var(--red); color: #fff; margin-top: 8px; }
.btn-leave:hover:not(:disabled) { background: #e03356; }

.spinner-w { width: 18px; height: 18px; border: 2px solid rgba(0,0,0,0.2); border-top-color: currentColor; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.section { display: flex; flex-direction: column; gap: 14px; }
.section-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
.section-header h3 { font-size: 1.05rem; }
.date-filters { display: flex; gap: 6px; }
.filter-btn { background: var(--surface); border: 1px solid var(--border); color: var(--muted); padding: 6px 14px; border-radius: 8px; cursor: pointer; font-size: 0.82rem; font-family: var(--font-display); font-weight: 600; transition: all 0.2s; }
.filter-btn.active, .filter-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }

.loading, .empty { color: var(--muted); text-align: center; padding: 40px; font-size: 0.9rem; }
.history-list { display: flex; flex-direction: column; gap: 10px; }
.hist-row { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; transition: border-color 0.2s; }
.hist-row:hover { border-color: var(--border2); }
.hist-obj { font-weight: 600; font-size: 0.97rem; margin-bottom: 8px; }
.hist-times { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 4px; }
.time-arrive, .time-leave, .time-active { font-size: 0.84rem; color: var(--muted2); }
.time-active { color: var(--amber); }
.hist-dur { font-size: 0.82rem; color: var(--blue); margin-top: 4px; }

@media (max-width: 600px) {
  .header { padding: 14px 16px; }
  .main { padding: 20px 16px; }
  .hist-times { flex-direction: column; gap: 4px; }
}
</style>
