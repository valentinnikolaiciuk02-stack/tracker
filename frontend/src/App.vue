<template>
  <RouterView />
</template>

<script setup>
import { RouterView } from 'vue-router';
</script>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --c-black: #0a0a0a;
  --c-900: #111111;
  --c-800: #1a1a1a;
  --c-700: #222222;
  --c-600: #2d2d2d;
  --c-500: #3d3d3d;
  --c-400: #555555;
  --c-300: #888888;
  --c-200: #bbbbbb;
  --c-100: #e8e8e8;
  --c-white: #f5f5f5;

  --accent: #c8ff00;
  --accent-dim: rgba(200,255,0,0.08);
  --accent-dark: #8ab800;

  --green: #00e676;
  --green-dim: rgba(0,230,118,0.08);
  --red: #ff3d3d;
  --red-dim: rgba(255,61,61,0.08);
  --amber: #ffab00;
  --amber-dim: rgba(255,171,0,0.08);
  --blue: #00b0ff;

  --font-display: 'Unbounded', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --r: 6px;
  --r-lg: 10px;
}

html { scroll-behavior: smooth; }

body {
  font-family: var(--font-mono);
  background: var(--c-black);
  color: var(--c-200);
  min-height: 100vh;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4 { font-family: var(--font-display); color: var(--c-white); }

input, select, textarea, button { font-family: var(--font-mono); }

::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: var(--c-900); }
::-webkit-scrollbar-thumb { background: var(--c-600); border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: var(--c-400); }

::selection { background: var(--accent); color: #000; }
</style>
