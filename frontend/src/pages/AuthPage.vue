<template>
  <div class="auth-wrap">
    <div class="auth-bg">
      <div class="grid-lines"></div>
      <div class="glow glow-1"></div>
      <div class="glow glow-2"></div>
    </div>

    <div class="auth-card">
      <div class="brand">
        <span class="brand-icon">◈</span>
        <span class="brand-name">TRACKER</span>
      </div>

      <div class="tabs">
        <button :class="['tab', { active: mode === 'login' }]" @click="mode = 'login'; error = ''">Вход</button>
        <button :class="['tab', { active: mode === 'register' }]" @click="mode = 'register'; error = ''">Регистрация</button>
      </div>

      <form @submit.prevent="submit" class="form">
        <template v-if="mode === 'register'">
          <div class="field">
            <label>Полное имя</label>
            <input v-model="form.name" type="text" placeholder="Иван Петров" required />
          </div>
        </template>
        <div class="field">
          <label>Email</label>
          <input v-model="form.email" type="email" placeholder="you@company.com" required />
        </div>
        <div class="field">
          <label>Пароль</label>
          <input v-model="form.password" type="password" placeholder="••••••••" required />
        </div>

        <div v-if="error" class="error-box">{{ error }}</div>

        <button type="submit" class="btn-submit" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          <span v-else>{{ mode === 'login' ? 'Войти' : 'Зарегистрироваться' }}</span>
        </button>
      </form>

      <p class="hint" v-if="mode === 'login'">
        Администратор: <code>admin@company.com</code> / <code>Admin123456</code>
      </p>
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

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    if (mode.value === 'login') {
      const user = await auth.login(form.email, form.password);
      router.push(user.role === 'admin' ? '/admin' : '/dashboard');
    } else {
      await auth.register(form.name, form.email, form.password);
      router.push('/dashboard');
    }
  } catch (e) {
    error.value = typeof e === 'string' ? e : 'Ошибка. Проверьте данные.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
}
.auth-bg { position: fixed; inset: 0; pointer-events: none; }
.grid-lines {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(232,255,71,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(232,255,71,0.03) 1px, transparent 1px);
  background-size: 60px 60px;
}
.glow { position: absolute; border-radius: 50%; filter: blur(120px); }
.glow-1 { width: 500px; height: 500px; top: -100px; left: -100px; background: var(--blue); opacity: 0.2; }
.glow-2 { width: 400px; height: 400px; bottom: -80px; right: -80px; background: var(--accent); opacity: 0.1; }

.auth-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 40px;
  width: 100%;
  max-width: 420px;
  position: relative;
  z-index: 1;
  box-shadow: 0 40px 80px rgba(0,0,0,0.4);
}

.brand { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; }
.brand-icon { font-size: 1.8rem; color: var(--accent); line-height: 1; }
.brand-name { font-family: var(--font-display); font-weight: 800; font-size: 1.3rem; letter-spacing: 0.12em; }

.tabs { display: flex; background: var(--surface2); border-radius: 12px; padding: 4px; margin-bottom: 28px; }
.tab {
  flex: 1; padding: 10px; border: none; background: transparent;
  color: var(--muted); font-family: var(--font-display); font-size: 0.9rem;
  font-weight: 600; cursor: pointer; border-radius: 10px; transition: all 0.2s;
}
.tab.active { background: var(--accent); color: #000; }

.form { display: flex; flex-direction: column; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 0.78rem; font-weight: 500; color: var(--muted2); text-transform: uppercase; letter-spacing: 0.08em; }
.field input {
  background: var(--surface2); border: 1px solid var(--border); border-radius: 10px;
  padding: 12px 16px; color: var(--text); font-size: 0.95rem; transition: border-color 0.2s;
}
.field input:focus { outline: none; border-color: var(--accent); }
.field input::placeholder { color: var(--muted); }

.error-box {
  background: var(--red-dim); border: 1px solid rgba(255,77,109,0.3);
  color: var(--red); padding: 10px 14px; border-radius: 8px; font-size: 0.88rem;
}

.btn-submit {
  background: var(--accent); color: #000; border: none; border-radius: 10px;
  padding: 14px; font-family: var(--font-display); font-size: 1rem; font-weight: 700;
  cursor: pointer; transition: opacity 0.2s; display: flex; align-items: center;
  justify-content: center; gap: 8px; margin-top: 4px;
}
.btn-submit:hover { opacity: 0.9; }
.btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

.spinner {
  width: 18px; height: 18px;
  border: 2px solid rgba(0,0,0,0.3);
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.hint { margin-top: 20px; font-size: 0.8rem; color: var(--muted); text-align: center; }
.hint code { background: var(--surface2); padding: 2px 6px; border-radius: 4px; color: var(--muted2); font-size: 0.78rem; }
</style>
