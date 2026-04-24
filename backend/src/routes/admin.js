import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

export function adminRoutes(db) {
  const router = Router();
  router.use(authMiddleware, adminMiddleware);

  router.get('/employees', (req, res) => {
    const employees = db.getAllEmployees();
    res.json({ employees });
  });

  router.get('/employees/:id/history', (req, res) => {
    const { id } = req.params;
    const { from, to } = req.query;

    const user = db.getUserById(id);
    if (!user) return res.status(404).json({ error: 'Сотрудник не найден' });

    const sessions = db.getUserSessions(id, from, to);
    res.json({ user, sessions });
  });

  router.get('/active', (req, res) => {
    const active = db.getAllActiveSessions();
    res.json({ active });
  });

  return router;
}
