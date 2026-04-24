import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../lib/api.js';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'));
  const token = ref(localStorage.getItem('token') || null);

  const isLoggedIn = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');

  async function login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    user.value = data.user;
    token.value = data.token;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  }

  async function register(name, email, password) {
    const data = await api.post('/auth/register', { name, email, password });
    user.value = data.user;
    token.value = data.token;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  }

  function logout() {
    user.value = null;
    token.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  return { user, token, isLoggedIn, isAdmin, login, register, logout };
});
