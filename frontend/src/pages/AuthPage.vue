<template>
  <div class="auth-root">
    <div class="auth-noise"></div>
    <div class="auth-grid"></div>

    <div class="auth-wrap">
      <div class="brand">
        <span class="brand-mark">▣</span>
        <span class="brand-text">TRACKER</span>
        <span class="brand-ver">v2.0</span>
      </div>

      <div class="auth-card">
        <div class="tabs">
          <button :class="['tab', { active: mode === 'login' }]" @click="switchMode('login')">ВХОД</button>
          <button :class="['tab', { active: mode === 'register' }]" @click="switchMode('register')">РЕГИСТРАЦИЯ</button>
        </div>

        <form @submit.prevent="submit">
          <div v-if="mode === 'register'" class="field">
            <label>ИМЯ СОТРУДНИКА</label>
            <input v-model="form.name" type="text" placeholder="Иван Петров" required />
          </div>
          <div class="field">
            <label>EMAIL</label>
            <input v-model="form.email" type="email" placeholder="you@company.com" required />
          </div>
          <div class="field">
            <label>ПАРОЛЬ</label>
            <input v-model="form.password" type="password" placeholder="••••••••" required />
          </div>

          <div v-if="error" class="error-msg">⚠ {{ error }}</div>

          <button type="submit" class="btn-submit" :disabled="loading">
            <span v-if="loading" class="dot-loader"><span></span><span></span><span></span></span>
            <span v-else>{{ mode === 'login' ? 'ВОЙТИ →' : 'ЗАРЕГИСТРИРОВАТЬСЯ →' }}</span>
          </button>
        </form>

        <div class="hint">
          <span class="hint-label">ADMIN</span>
          <code>admin@company.com</code>
          <span>/</span>
          <code>Admin123456</code>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const router = useRouter();
const auth = useAuthStore();
const mode = ref('login');
const loading = ref(false);
const error = ref('');
const form = reactive({ name: '', email: '', password: '' });

function switchMode(m) { mode.value = m; error.value = ''; }

async function submit() {
  error.value = ''; loading.value = true;
  try {
    if (mode.value === 'login') {
      const user = await auth.login(form.email, form.password);
      router.push(user.role === 'admin' ? '/admin' : '/dashboard');
    } else {
      await auth.register(form.name, form.email, form.password);
      router.push('/dashboard');
    }
  } catch (e) {
    error.value = typeof e === 'string' ? e : 'Ошибка';
  } finally { loading.value = false; }
}
</script>

<style scoped>
.auth-root {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: var(--c-black);
}

.auth-noise {
  position: fixed; inset: 0; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  opacity: 0.4;
}

.auth-grid {
  position: fixed; inset: 0; pointer-events: none;
  background-image: linear-gradient(var(--c-800) 1px, transparent 1px), linear-gradient(90deg, var(--c-800) 1px, transparent 1px);
  background-size: 40px 40px;
  opacity: 0.3;
}

.auth-wrap {
  width: 100%; max-width: 420px; padding: 24px;
  position: relative; z-index: 1;
}

.brand {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 32px;
}
.brand-mark { font-size: 1.5rem; color: var(--accent); line-height: 1; }
.brand-text { font-family: var(--font-display); font-weight: 900; font-size: 1.4rem; letter-spacing: 0.15em; color: var(--c-white); }
.brand-ver { font-size: 0.65rem; color: var(--c-400); background: var(--c-700); padding: 2px 6px; border-radius: 3px; margin-left: 4px; }

.auth-card {
  background: var(--c-900);
  border: 1px solid var(--c-600);
  border-radius: var(--r-lg);
  padding: 32px;
  box-shadow: 0 0 0 1px var(--c-700), 0 24px 48px rgba(0,0,0,0.6);
}

.tabs { display: flex; gap: 2px; background: var(--c-800); border-radius: var(--r); padding: 3px; margin-bottom: 28px; }
.tab {
  flex: 1; padding: 9px; border: none; background: transparent;
  color: var(--c-400); font-family: var(--font-display); font-size: 0.7rem;
  font-weight: 700; letter-spacing: 0.1em; cursor: pointer; border-radius: 4px;
  transition: all 0.15s;
}
.tab.active { background: var(--c-700); color: var(--accent); }

.field { margin-bottom: 16px; }
.field label { display: block; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.12em; color: var(--c-400); margin-bottom: 6px; }
.field input {
  width: 100%; background: var(--c-800); border: 1px solid var(--c-600);
  border-radius: var(--r); padding: 11px 14px; color: var(--c-100);
  font-size: 0.9rem; transition: border-color 0.15s;
}
.field input:focus { outline: none; border-color: var(--accent); }
.field input::placeholder { color: var(--c-500); }

.error-msg { background: var(--red-dim); border: 1px solid var(--red); color: var(--red); padding: 10px 14px; border-radius: var(--r); font-size: 0.82rem; margin-bottom: 16px; }

.btn-submit {
  width: 100%; padding: 13px; background: var(--accent); color: #000;
  border: none; border-radius: var(--r); font-family: var(--font-display);
  font-size: 0.8rem; font-weight: 700; letter-spacing: 0.1em; cursor: pointer;
  transition: all 0.15s; margin-top: 4px;
}
.btn-submit:hover { background: #d4ff1a; transform: translateY(-1px); }
.btn-submit:active { transform: translateY(0); }
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

.dot-loader { display: flex; gap: 4px; justify-content: center; align-items: center; }
.dot-loader span { width: 6px; height: 6px; background: #000; border-radius: 50%; animation: bounce 0.6s infinite alternate; }
.dot-loader span:nth-child(2) { animation-delay: 0.2s; }
.dot-loader span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce { to { transform: translateY(-4px); opacity: 0.5; } }

.hint { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--c-700); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 0.75rem; color: var(--c-400); }
.hint-label { background: var(--c-700); color: var(--c-300); padding: 2px 6px; border-radius: 3px; font-weight: 700; font-size: 0.6rem; letter-spacing: 0.1em; }
.hint code { background: var(--c-800); color: var(--c-200); padding: 2px 6px; border-radius: 3px; font-size: 0.72rem; }
</style>
