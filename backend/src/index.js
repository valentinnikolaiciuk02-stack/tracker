import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import initSqlJs from 'sql.js';
import bcrypt from 'bcryptjs';

import { authRoutes } from './routes/auth.js';
import { sessionRoutes } from './routes/sessions.js';
import { objectRoutes } from './routes/objects.js';
import { adminRoutes } from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'tracker.db');

mkdirSync(DATA_DIR, { recursive: true });

// ── Init sql.js ──────────────────────────────────────────────────────────────
const SQL = await initSqlJs();

let sqlDb;
if (existsSync(DB_FILE)) {
  const fileBuffer = readFileSync(DB_FILE);
  sqlDb = new SQL.Database(fileBuffer);
} else {
  sqlDb = new SQL.Database();
}

function saveDb() {
  const data = sqlDb.export();
  writeFileSync(DB_FILE, Buffer.from(data));
}

// Save to disk every 5 seconds and on process exit
setInterval(saveDb, 5000);
process.on('exit', saveDb);
process.on('SIGINT', () => { saveDb(); process.exit(); });
process.on('SIGTERM', () => { saveDb(); process.exit(); });

// ── Schema ───────────────────────────────────────────────────────────────────
sqlDb.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS objects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    object_id INTEGER NOT NULL,
    arrived_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    left_at TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (object_id) REFERENCES objects(id)
  );
`);

// Seed default objects
sqlDb.run(`
  INSERT OR IGNORE INTO objects (name) VALUES
    ('Объект №1 — Главный офис'),
    ('Объект №2 — Склад А'),
    ('Объект №3 — Производство'),
    ('Объект №4 — Филиал Север');
`);

// ── DB helper layer ───────────────────────────────────────────────────────────
// sql.js has a different API than better-sqlite3, so we wrap it here

function queryAll(sql, params = []) {
  try {
    const stmt = sqlDb.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  } catch (e) {
    console.error('queryAll error:', e.message, sql);
    return [];
  }
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows[0] || null;
}

function run(sql, params = []) {
  try {
    sqlDb.run(sql, params);
    return sqlDb.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0];
  } catch (e) {
    console.error('run error:', e.message, sql);
    throw e;
  }
}

// ── DB API object ─────────────────────────────────────────────────────────────
const db = {
  // Users
  getUser: (email) => queryOne('SELECT * FROM users WHERE email = ?', [email]),
  getUserById: (id) => queryOne('SELECT id, name, email, role, created_at FROM users WHERE id = ? AND role = "employee"', [id]),
  createUser: (name, email, password, role) => run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, password, role]),

  // Objects
  getAllObjects: () => queryAll('SELECT * FROM objects ORDER BY name'),
  getObject: (id) => queryOne('SELECT * FROM objects WHERE id = ?', [id]),
  getObjectByName: (name) => queryOne('SELECT * FROM objects WHERE name = ?', [name]),
  createObject: (name) => run('INSERT INTO objects (name) VALUES (?)', [name]),

  // Sessions
  getSession: (id) => queryOne(`
    SELECT s.*, o.name as object_name FROM sessions s
    JOIN objects o ON s.object_id = o.id WHERE s.id = ?`, [id]),

  getActiveSession: (userId) => queryOne(`
    SELECT s.*, o.name as object_name FROM sessions s
    JOIN objects o ON s.object_id = o.id
    WHERE s.user_id = ? AND s.status = 'active' ORDER BY s.arrived_at DESC LIMIT 1`, [userId]),

  createSession: (userId, objectId) => run(`
    INSERT INTO sessions (user_id, object_id, arrived_at, status)
    VALUES (?, ?, datetime('now', 'localtime'), 'active')`, [userId, objectId]),

  closeSession: (id) => run(`
    UPDATE sessions SET status = 'closed', left_at = datetime('now', 'localtime') WHERE id = ?`, [id]),

  closeActiveSession: (userId) => run(`
    UPDATE sessions SET status = 'closed', left_at = datetime('now', 'localtime')
    WHERE user_id = ? AND status = 'active'`, [userId]),

  getUserSessions: (userId, from, to) => {
    let sql = `
      SELECT s.*, o.name as object_name FROM sessions s
      JOIN objects o ON s.object_id = o.id WHERE s.user_id = ?`;
    const params = [userId];
    if (from) { sql += ` AND date(s.arrived_at) >= ?`; params.push(from); }
    if (to)   { sql += ` AND date(s.arrived_at) <= ?`; params.push(to); }
    sql += ` ORDER BY s.arrived_at DESC`;
    return queryAll(sql, params);
  },

  getAllEmployees: () => queryAll(`
    SELECT u.id, u.name, u.email, u.created_at,
      (SELECT o.name FROM sessions s JOIN objects o ON s.object_id = o.id
       WHERE s.user_id = u.id AND s.status = 'active' LIMIT 1) as current_object,
      (SELECT COUNT(*) FROM sessions WHERE user_id = u.id) as total_sessions
    FROM users u WHERE u.role = 'employee' ORDER BY u.name`),

  getAllActiveSessions: () => queryAll(`
    SELECT s.id, s.arrived_at, u.name as user_name, u.id as user_id, o.name as object_name
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    JOIN objects o ON s.object_id = o.id
    WHERE s.status = 'active' ORDER BY s.arrived_at DESC`),
};

// ── Seed admin ────────────────────────────────────────────────────────────────
const existingAdmin = db.getUser(process.env.ADMIN_EMAIL);
if (!existingAdmin) {
  const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
  db.createUser(process.env.ADMIN_NAME, process.env.ADMIN_EMAIL, hash, 'admin');
  saveDb();
  console.log(`✅ Администратор создан: ${process.env.ADMIN_EMAIL} / ${process.env.ADMIN_PASSWORD}`);
}

// ── Express ───────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());import { join } from 'path';

app.use('/api/auth', authRoutes(db));
app.use('/api/sessions', sessionRoutes(db));
app.use('/api/objects', objectRoutes(db));
app.use('/api/admin', adminRoutes(db));

app.use(express.static(new URL('public', import.meta.url).pathname)); app.get('*', (_, res) => res.sendFile(new URL('public/index.html', import.meta.url).pathname)); app.get('/api/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {// Serve frontend
const frontendDist = join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (_, res) => {
  res.sendFile(join(frontendDist, 'index.html'));
});
  console.log(`🚀 Backend запущен: http://localhost:${PORT}`);
});
