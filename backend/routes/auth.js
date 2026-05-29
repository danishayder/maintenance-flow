const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (email === 'admin@maintain.com' && password === 'admin') {
    const token = jwt.sign({ email, role: 'admin', name: 'Admin User' }, process.env.JWT_SECRET);
    return res.json({ token, user: { email, role: 'admin', name: 'Admin User' } });
  }
  if (email === 'tech@maintain.com' && password === 'tech') {
    const token = jwt.sign({ email, role: 'technician', name: 'Ahmed Technician' }, process.env.JWT_SECRET);
    return res.json({ token, user: { email, role: 'technician', name: 'Ahmed Technician' } });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

module.exports = router;