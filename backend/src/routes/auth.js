import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export function authRoutes(db) {
  const router = Router();

  router.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Заполните все поля' });
    if (password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });
    if (db.getUser(email)) return res.status(400).json({ error: 'Email уже зарегистрирован' });
    const hash = bcrypt.hashSync(password, 10);
    const id = db.createUser(name, email, hash, 'employee', 0);
    const user = { id, name, email, role: 'employee', hourly_rate: 0 };
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user });
  });

  router.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Заполните все поля' });
    const user = db.getUser(email);
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Неверный email или пароль' });
    const payload = { id: user.id, name: user.name, email: user.email, role: user.role, hourly_rate: user.hourly_rate };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: payload });
  });

  return router;
}
