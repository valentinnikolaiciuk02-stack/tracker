import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

export function sessionRoutes(db) {
  const router = Router();

  router.get('/current', authMiddleware, (req, res) => {
    const session = db.getActiveSession(req.user.id);
    res.json({ session: session || null });
  });

  router.post('/arrive', authMiddleware, (req, res) => {
    const { object_id } = req.body;
    if (!object_id) return res.status(400).json({ error: 'Укажите объект' });
    const obj = db.getObject(object_id);
    if (!obj) return res.status(404).json({ error: 'Объект не найден' });

    // Check if there's a travel record to close
    const travel = db.getActiveTravel(req.user.id);
    if (travel) {
      db.closeTravel(travel.id);
    }

    // Close any active work session
    db.closeActiveSession(req.user.id);

    const id = db.createSession(req.user.id, object_id);
    const session = db.getSession(id);
    res.json({ session });
  });

  router.post('/leave', authMiddleware, (req, res) => {
    const active = db.getActiveSession(req.user.id);
    if (!active) return res.status(400).json({ error: 'Нет активной сессии' });

    db.closeSession(active.id);

    // Create travel record
    const travelId = db.createTravel(req.user.id, active.object_id);
    const session = db.getSession(active.id);
    const travel = db.getTravel(travelId);

    res.json({ session, travel });
  });

  router.get('/history', authMiddleware, (req, res) => {
    const { from, to } = req.query;
    const sessions = db.getUserSessions(req.user.id, from, to);
    const travels = db.getUserTravels(req.user.id, from, to);
    const stats = db.getUserStats(req.user.id, from, to);
    res.json({ sessions, travels, stats });
  });

  router.get('/stats', authMiddleware, (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const user = db.getUserById(req.user.id) || db.getUserByIdAll(req.user.id);
    const rate = user?.hourly_rate || 0;

    const dayStats = db.getUserStats(req.user.id, today, today);
    const weekStats = db.getUserStats(req.user.id, weekAgo, today);
    const monthStats = db.getUserStats(req.user.id, monthAgo, today);

    res.json({
      hourly_rate: rate,
      day: { ...dayStats, earnings: ((dayStats.work_minutes || 0) / 60 * rate).toFixed(2) },
      week: { ...weekStats, earnings: ((weekStats.work_minutes || 0) / 60 * rate).toFixed(2) },
      month: { ...monthStats, earnings: ((monthStats.work_minutes || 0) / 60 * rate).toFixed(2) },
    });
  });

  return router;
}
