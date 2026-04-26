import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

export function objectRoutes(db) {
  const router = Router();

  router.get('/', authMiddleware, (req, res) => {
    res.json({ objects: db.getAllObjects() });
  });

  router.post('/', authMiddleware, (req, res) => {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Введите название объекта' });
    const existing = db.getObjectByName(name.trim());
    if (existing) return res.json({ object: existing });
    const id = db.createObject(name.trim());
    res.json({ object: db.getObject(id) });
  });

  return router;
}
