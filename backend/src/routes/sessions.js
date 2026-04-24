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

    // Close any active session
    db.closeActiveSession(req.user.id);

    const id = db.createSession(req.user.id, object_id);
    const session = db.getSession(id);
    res.json({ session });
  });

  router.post('/leave', authMiddleware, (req, res) => {
    const active = db.getActiveSession(req.user.id);
    if (!active) return res.status(400).json({ error: 'Нет активной сессии' });

    db.closeSession(active.id);
    const session = db.getSession(active.id);
    res.json({ session });
  });

  router.get('/history', authMiddleware, (req, res) => {
    const { from, to } = req.query;
    const sessions = db.getUserSessions(req.user.id, from, to);
    res.json({ sessions });
  });

  return router;
}
