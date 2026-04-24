import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

export function objectRoutes(db) {
  const router = Router();

  router.get('/', authMiddleware, (req, res) => {
    const objects = db.getAllObjects();
    res.json({ objects });
  });

  router.post('/', authMiddleware, (req, res) => {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Введите название объекта' });

    const existing = db.getObjectByName(name.trim());
    if (existing) return res.json({ object: existing });

    const id = db.createObject(name.trim());
    const object = db.getObject(id);
    res.json({ object });
  });

  return router;
}
