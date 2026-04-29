import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path, { join } from 'path';
import pkg from 'pg';
import bcrypt from 'bcryptjs';

import { authRoutes } from './routes/auth.js';
import { sessionRoutes } from './routes/sessions.js';
import { objectRoutes } from './routes/objects.js';
import { adminRoutes } from './routes/admin.js';

const { Pool } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway.internal') ? false : { rejectUnauthorized: false }
});

async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const res = await client.query(sql, params);
    return res.rows;
  } finally { client.release(); }
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function run(sql, params = []) {
  const rows = await query(sql + ' RETURNING id', params);
  return rows[0]?.id;
}

// Brussels time helper
function nowBrussels() {
  return new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
}

async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee',
      hourly_rate REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS objects (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      object_id INTEGER NOT NULL,
      arrived_at TEXT NOT NULL,
      left_at TEXT,
      status TEXT NOT NULL DEFAULT 'active'
    );
    CREATE TABLE IF NOT EXISTS travel_records (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      from_object_id INTEGER,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      status TEXT NOT NULL DEFAULT 'active'
    );
  `);

  // Add hourly_rate if missing
  try { await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS hourly_rate REAL NOT NULL DEFAULT 0`); } catch {}

  // Seed objects
  const objs = ['Объект №1 — Главный офис','Объект №2 — Склад А','Объект №3 — Производство','Объект №4 — Филиал Север'];
  for (const name of objs) {
    await query(`INSERT INTO objects (name, created_at) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`, [name, nowBrussels()]);
  }

  // Seed admin
  const existing = await queryOne(`SELECT id FROM users WHERE email = $1`, [process.env.ADMIN_EMAIL]);
  if (!existing) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
    await query(`INSERT INTO users (name, email, password, role, hourly_rate, created_at) VALUES ($1,$2,$3,'admin',0,$4)`,
      [process.env.ADMIN_NAME, process.env.ADMIN_EMAIL, hash, nowBrussels()]);
    console.log('✅ Админ создан');
  }
}

const db = {
  getUser: (email) => queryOne(`SELECT * FROM users WHERE email = $1`, [email]),
  getUserById: (id) => queryOne(`SELECT id,name,email,role,hourly_rate,created_at FROM users WHERE id=$1 AND role='employee'`, [id]),
  getUserByIdAll: (id) => queryOne(`SELECT id,name,email,role,hourly_rate,created_at FROM users WHERE id=$1`, [id]),
  createUser: async (name, email, password, role, hourly_rate=0) => {
    const now = nowBrussels();
    const rows = await query(`INSERT INTO users (name,email,password,role,hourly_rate,created_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, [name,email,password,role,hourly_rate,now]);
    return rows[0]?.id;
  },
  updateRate: (id, rate) => query(`UPDATE users SET hourly_rate=$1 WHERE id=$2`, [rate, id]),

  getAllObjects: () => query(`SELECT * FROM objects ORDER BY name`),
  getObject: (id) => queryOne(`SELECT * FROM objects WHERE id=$1`, [id]),
  getObjectByName: (name) => queryOne(`SELECT * FROM objects WHERE name=$1`, [name]),
  createObject: async (name) => {
    const rows = await query(`INSERT INTO objects (name,created_at) VALUES ($1,$2) RETURNING id`, [name, nowBrussels()]);
    return rows[0]?.id;
  },

  getSession: (id) => queryOne(`SELECT s.*,o.name as object_name FROM sessions s JOIN objects o ON s.object_id=o.id WHERE s.id=$1`, [id]),
  getActiveSession: (userId) => queryOne(`SELECT s.*,o.name as object_name FROM sessions s JOIN objects o ON s.object_id=o.id WHERE s.user_id=$1 AND s.status='active' ORDER BY s.arrived_at DESC LIMIT 1`, [userId]),
  createSession: async (userId, objectId) => {
    const rows = await query(`INSERT INTO sessions (user_id,object_id,arrived_at,status) VALUES ($1,$2,$3,'active') RETURNING id`, [userId, objectId, nowBrussels()]);
    return rows[0]?.id;
  },
  closeSession: (id) => query(`UPDATE sessions SET status='closed',left_at=$1 WHERE id=$2`, [nowBrussels(), id]),
  closeActiveSession: (userId) => query(`UPDATE sessions SET status='closed',left_at=$1 WHERE user_id=$2 AND status='active'`, [nowBrussels(), userId]),

  getUserSessions: (userId, from, to) => {
    let sql = `SELECT s.*,o.name as object_name,
      ROUND(EXTRACT(EPOCH FROM (left_at::timestamp - arrived_at::timestamp))/60) as duration_minutes
      FROM sessions s JOIN objects o ON s.object_id=o.id
      WHERE s.user_id=$1 AND s.status='closed'`;
    const params = [userId];
    let i = 2;
    if (from) { sql += ` AND DATE(s.arrived_at)>=$${i++}`; params.push(from); }
    if (to) { sql += ` AND DATE(s.arrived_at)<=$${i++}`; params.push(to); }
    sql += ` ORDER BY s.arrived_at DESC`;
    return query(sql, params);
  },

  getTravel: (id) => queryOne(`SELECT t.*,o.name as from_object_name FROM travel_records t LEFT JOIN objects o ON t.from_object_id=o.id WHERE t.id=$1`, [id]),
  getActiveTravel: (userId) => queryOne(`SELECT t.*,o.name as from_object_name FROM travel_records t LEFT JOIN objects o ON t.from_object_id=o.id WHERE t.user_id=$1 AND t.status='active' ORDER BY t.started_at DESC LIMIT 1`, [userId]),
  createTravel: async (userId, fromObjectId) => {
    const rows = await query(`INSERT INTO travel_records (user_id,from_object_id,started_at,status) VALUES ($1,$2,$3,'active') RETURNING id`, [userId, fromObjectId, nowBrussels()]);
    return rows[0]?.id;
  },
  closeTravel: (id) => query(`UPDATE travel_records SET status='closed',ended_at=$1 WHERE id=$2`, [nowBrussels(), id]),

  getUserTravels: (userId, from, to) => {
    let sql = `SELECT t.*,o.name as from_object_name,
      ROUND(EXTRACT(EPOCH FROM (ended_at::timestamp - started_at::timestamp))/60) as duration_minutes
      FROM travel_records t LEFT JOIN objects o ON t.from_object_id=o.id
      WHERE t.user_id=$1 AND t.status='closed'`;
    const params = [userId];
    let i = 2;
    if (from) { sql += ` AND DATE(t.started_at)>=$${i++}`; params.push(from); }
    if (to) { sql += ` AND DATE(t.started_at)<=$${i++}`; params.push(to); }
    sql += ` ORDER BY t.started_at DESC`;
    return query(sql, params);
  },

  getUserStats: async (userId, from, to) => {
    let wSql = `SELECT COALESCE(SUM(ROUND(EXTRACT(EPOCH FROM (left_at::timestamp - arrived_at::timestamp))/60)),0) as work_minutes,
      COUNT(DISTINCT DATE(arrived_at)) as work_days
      FROM sessions WHERE user_id=$1 AND status='closed'`;
    const wP = [userId]; let wi = 2;
    if (from) { wSql += ` AND DATE(arrived_at)>=$${wi++}`; wP.push(from); }
    if (to) { wSql += ` AND DATE(arrived_at)<=$${wi++}`; wP.push(to); }

    let tSql = `SELECT COALESCE(SUM(ROUND(EXTRACT(EPOCH FROM (ended_at::timestamp - started_at::timestamp))/60)),0) as travel_minutes
      FROM travel_records WHERE user_id=$1 AND status='closed'`;
    const tP = [userId]; let ti = 2;
    if (from) { tSql += ` AND DATE(started_at)>=$${ti++}`; tP.push(from); }
    if (to) { tSql += ` AND DATE(started_at)<=$${ti++}`; tP.push(to); }

    const wRow = await queryOne(wSql, wP);
    const tRow = await queryOne(tSql, tP);

    const rawWork = Number(wRow?.work_minutes) || 0;
    const workDays = Number(wRow?.work_days) || 0;
    const work_minutes = Math.max(0, rawWork - workDays * 30);

    return { work_minutes, travel_minutes: Number(tRow?.travel_minutes) || 0 };
  },

  getAllEmployees: () => query(`
    SELECT u.id,u.name,u.email,u.hourly_rate,u.created_at,
      (SELECT o.name FROM sessions s JOIN objects o ON s.object_id=o.id WHERE s.user_id=u.id AND s.status='active' LIMIT 1) as current_object,
      (SELECT COUNT(*) FROM sessions WHERE user_id=u.id) as total_sessions
    FROM users u WHERE u.role='employee' ORDER BY u.name`),

  getAllActiveSessions: () => query(`
    SELECT s.id,s.arrived_at,u.name as user_name,u.id as user_id,o.name as object_name
    FROM sessions s JOIN users u ON s.user_id=u.id JOIN objects o ON s.object_id=o.id
    WHERE s.status='active' ORDER BY s.arrived_at DESC`),
};

await initDb();

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
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 http://localhost:${PORT}`));
