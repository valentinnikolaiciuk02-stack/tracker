import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

export function adminRoutes(db) {
  const router = Router();
  router.use(authMiddleware, adminMiddleware);

  router.get('/employees', (req, res) => {
    res.json({ employees: db.getAllEmployees() });
  });

  router.get('/employees/:id/history', (req, res) => {
    const { id } = req.params;
    const { from, to } = req.query;
    const user = db.getUserById(id);
    if (!user) return res.status(404).json({ error: 'Сотрудник не найден' });
    const sessions = db.getUserSessions(id, from, to);
    const travels = db.getUserTravels(id, from, to);
    const stats = db.getUserStats(id, from, to);
    res.json({ user, sessions, travels, stats });
  });

  router.get('/employees/:id/stats', (req, res) => {
    const { id } = req.params;
    const user = db.getUserById(id);
    if (!user) return res.status(404).json({ error: 'Сотрудник не найден' });

    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const rate = user.hourly_rate || 0;

    res.json({
      user,
      hourly_rate: rate,
      day: { ...db.getUserStats(id, today, today), earnings: (db.getUserStats(id, today, today).work_minutes / 60 * rate).toFixed(2) },
      week: { ...db.getUserStats(id, weekAgo, today), earnings: (db.getUserStats(id, weekAgo, today).work_minutes / 60 * rate).toFixed(2) },
      month: { ...db.getUserStats(id, monthAgo, today), earnings: (db.getUserStats(id, monthAgo, today).work_minutes / 60 * rate).toFixed(2) },
    });
  });

  router.put('/employees/:id/rate', (req, res) => {
    const { id } = req.params;
    const { hourly_rate } = req.body;
    if (hourly_rate === undefined) return res.status(400).json({ error: 'Укажите ставку' });
    db.updateRate(id, hourly_rate);
    res.json({ ok: true });
  });

  router.get('/active', (req, res) => {
    res.json({ active: db.getAllActiveSessions() });
  });

  router.delete('/employees/:id', async (req, res) => {
    const { id } = req.params;
    const user = await db.getUserById(id);
    if (!user) return res.status(404).json({ error: 'Сотрудник не найден' });
    await db.deleteEmployee(id);
    res.json({ ok: true });
  });

  return router;
}
// delete employee - added separately
