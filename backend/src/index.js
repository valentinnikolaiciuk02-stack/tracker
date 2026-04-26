import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path, { join } from 'path';
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

const SQL = await initSqlJs();
let sqlDb;
if (existsSync(DB_FILE)) {
  sqlDb = new SQL.Database(readFileSync(DB_FILE));
} else {
  sqlDb = new SQL.Database();
}

function saveDb() {
  writeFileSync(DB_FILE, Buffer.from(sqlDb.export()));
}

setInterval(saveDb, 5000);
process.on('exit', saveDb);
process.on('SIGINT', () => { saveDb(); process.exit(); });
process.on('SIGTERM', () => { saveDb(); process.exit(); });

// ── Schema ────────────────────────────────────────────────────────────────────
sqlDb.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    hourly_rate REAL NOT NULL DEFAULT 0,
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

  CREATE TABLE IF NOT EXISTS travel_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    from_object_id INTEGER,
    started_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    ended_at TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (from_object_id) REFERENCES objects(id)
  );
`);

// Add hourly_rate column if upgrading from old schema
try { sqlDb.run(`ALTER TABLE users ADD COLUMN hourly_rate REAL NOT NULL DEFAULT 0`); } catch {}

sqlDb.run(`INSERT OR IGNORE INTO objects (name) VALUES
  ('Объект №1 — Главный офис'),
  ('Объект №2 — Склад А'),
  ('Объект №3 — Производство'),
  ('Объект №4 — Филиал Север');`);

// ── DB helpers ─────────────────────────────────────────────────────────────────
function queryAll(sql, params = []) {
  try {
    const stmt = sqlDb.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  } catch (e) { console.error('queryAll:', e.message); return []; }
}

function queryOne(sql, params = []) {
  return queryAll(sql, params)[0] || null;
}

function run(sql, params = []) {
  try {
    sqlDb.run(sql, params);
    return sqlDb.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0];
  } catch (e) { console.error('run:', e.message); throw e; }
}

// ── DB API ─────────────────────────────────────────────────────────────────────
const db = {
  // Users
  getUser: (email) => queryOne('SELECT * FROM users WHERE email = ?', [email]),
  getUserById: (id) => queryOne('SELECT id, name, email, role, hourly_rate, created_at FROM users WHERE id = ? AND role = "employee"', [id]),
  getUserByIdAll: (id) => queryOne('SELECT id, name, email, role, hourly_rate, created_at FROM users WHERE id = ?', [id]),
  createUser: (name, email, password, role, hourly_rate = 0) => run('INSERT INTO users (name, email, password, role, hourly_rate) VALUES (?, ?, ?, ?, ?)', [name, email, password, role, hourly_rate]),
  updateRate: (id, rate) => run('UPDATE users SET hourly_rate = ? WHERE id = ?', [rate, id]),

  // Objects
  getAllObjects: () => queryAll('SELECT * FROM objects ORDER BY name'),
  getObject: (id) => queryOne('SELECT * FROM objects WHERE id = ?', [id]),
  getObjectByName: (name) => queryOne('SELECT * FROM objects WHERE name = ?', [name]),
  createObject: (name) => run('INSERT INTO objects (name) VALUES (?)', [name]),

  // Sessions
  getSession: (id) => queryOne(`SELECT s.*, o.name as object_name FROM sessions s JOIN objects o ON s.object_id = o.id WHERE s.id = ?`, [id]),
  getActiveSession: (userId) => queryOne(`SELECT s.*, o.name as object_name FROM sessions s JOIN objects o ON s.object_id = o.id WHERE s.user_id = ? AND s.status = 'active' ORDER BY s.arrived_at DESC LIMIT 1`, [userId]),
  createSession: (userId, objectId) => run(`INSERT INTO sessions (user_id, object_id, arrived_at, status) VALUES (?, ?, datetime('now', 'localtime'), 'active')`, [userId, objectId]),
  closeSession: (id) => run(`UPDATE sessions SET status = 'closed', left_at = datetime('now', 'localtime') WHERE id = ?`, [id]),
  closeActiveSession: (userId) => run(`UPDATE sessions SET status = 'closed', left_at = datetime('now', 'localtime') WHERE user_id = ? AND status = 'active'`, [userId]),

  getUserSessions: (userId, from, to) => {
    let sql = `SELECT s.*, o.name as object_name,
      ROUND((julianday(COALESCE(s.left_at, datetime('now','localtime'))) - julianday(s.arrived_at)) * 1440) as duration_minutes
      FROM sessions s JOIN objects o ON s.object_id = o.id WHERE s.user_id = ?`;
    const params = [userId];
    if (from) { sql += ` AND date(s.arrived_at) >= ?`; params.push(from); }
    if (to) { sql += ` AND date(s.arrived_at) <= ?`; params.push(to); }
    sql += ` ORDER BY s.arrived_at DESC`;
    return queryAll(sql, params);
  },

  // Travel
  getTravel: (id) => queryOne(`SELECT t.*, o.name as from_object_name FROM travel_records t LEFT JOIN objects o ON t.from_object_id = o.id WHERE t.id = ?`, [id]),
  getActiveTravel: (userId) => queryOne(`SELECT * FROM travel_records WHERE user_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1`, [userId]),
  createTravel: (userId, fromObjectId) => run(`INSERT INTO travel_records (user_id, from_object_id, started_at, status) VALUES (?, ?, datetime('now', 'localtime'), 'active')`, [userId, fromObjectId]),
  closeTravel: (id) => run(`UPDATE travel_records SET status = 'closed', ended_at = datetime('now', 'localtime') WHERE id = ?`, [id]),

  getUserTravels: (userId, from, to) => {
    let sql = `SELECT t.*, o.name as from_object_name,
      ROUND((julianday(COALESCE(t.ended_at, datetime('now','localtime'))) - julianday(t.started_at)) * 1440) as duration_minutes
      FROM travel_records t LEFT JOIN objects o ON t.from_object_id = o.id WHERE t.user_id = ?`;
    const params = [userId];
    if (from) { sql += ` AND date(t.started_at) >= ?`; params.push(from); }
    if (to) { sql += ` AND date(t.started_at) <= ?`; params.push(to); }
    sql += ` ORDER BY t.started_at DESC`;
    return queryAll(sql, params);
  },

  getUserStats: (userId, from, to) => {
    const params = [userId];
    let dateFilter = '';
    if (from) { dateFilter += ` AND date(arrived_at) >= '${from}'`; }
    if (to) { dateFilter += ` AND date(arrived_at) <= '${to}'`; }

    const workRow = queryOne(`SELECT COALESCE(SUM(ROUND((julianday(COALESCE(left_at, datetime('now','localtime'))) - julianday(arrived_at)) * 1440)), 0) as work_minutes FROM sessions WHERE user_id = ? AND status != 'active'${dateFilter}`, params);

    let travelFilter = '';
    if (from) { travelFilter += ` AND date(started_at) >= '${from}'`; }
    if (to) { travelFilter += ` AND date(started_at) <= '${to}'`; }
    const travelRow = queryOne(`SELECT COALESCE(SUM(ROUND((julianday(COALESCE(ended_at, datetime('now','localtime'))) - julianday(started_at)) * 1440)), 0) as travel_minutes FROM travel_records WHERE user_id = ?${travelFilter}`, params);

    return {
      work_minutes: workRow?.work_minutes || 0,
      travel_minutes: travelRow?.travel_minutes || 0,
    };
  },

  // Admin
  getAllEmployees: () => queryAll(`
    SELECT u.id, u.name, u.email, u.hourly_rate, u.created_at,
      (SELECT o.name FROM sessions s JOIN objects o ON s.object_id = o.id WHERE s.user_id = u.id AND s.status = 'active' LIMIT 1) as current_object,
      (SELECT COUNT(*) FROM sessions WHERE user_id = u.id) as total_sessions
    FROM users u WHERE u.role = 'employee' ORDER BY u.name`),

  getAllActiveSessions: () => queryAll(`
    SELECT s.id, s.arrived_at, u.name as user_name, u.id as user_id, o.name as object_name
    FROM sessions s JOIN users u ON s.user_id = u.id JOIN objects o ON s.object_id = o.id
    WHERE s.status = 'active' ORDER BY s.arrived_at DESC`),
};

// ── Seed admin ─────────────────────────────────────────────────────────────────
if (!db.getUser(process.env.ADMIN_EMAIL)) {
  const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
  db.createUser(process.env.ADMIN_NAME, process.env.ADMIN_EMAIL, hash, 'admin', 0);
  saveDb();
  console.log(`✅ Администратор создан: ${process.env.ADMIN_EMAIL}`);
}

// ── Express ────────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes(db));
app.use('/api/sessions', sessionRoutes(db));
app.use('/api/objects', objectRoutes(db));
app.use('/api/admin', adminRoutes(db));
app.get('/api/health', (_, res) => res.json({ ok: true }));

const frontendDist = join(__dirname, '../public');
app.use(express.static(frontendDist));
app.get('*', (_, res) => res.sendFile(join(frontendDist, 'index.html')));

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Сервер: http://localhost:${PORT}`));
