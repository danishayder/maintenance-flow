const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../db/supabase');

// Signup
router.post('/signup', async (req, res) => {
  const { email, password, company_name } = req.body;
  if (!email || !password || !company_name) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase
    .from('users')
    .insert([{ email, password_hash, company_name, role: 'admin' }])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  const user = data[0];
  const token = jwt.sign(
    { id: user.id, email: user.email, company_name: user.company_name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token, user: { email: user.email, company_name: user.company_name, role: user.role } });
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, data.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: data.id, email: data.email, company_name: data.company_name, role: data.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token, user: { email: data.email, company_name: data.company_name, role: data.role } });
});

// Demo login
router.post('/demo', async (req, res) => {
  let { data, error } = await supabase.from('users').select('*').eq('email', 'demo@maintain.com').single();
  if (error || !data) {
    const demoPassword = 'demo123';
    const password_hash = await bcrypt.hash(demoPassword, 10);
    const { data: newDemo, error: insertError } = await supabase
      .from('users')
      .insert([{ email: 'demo@maintain.com', password_hash, company_name: 'Demo Company', role: 'demo' }])
      .select();
    if (insertError) return res.status(500).json({ error: insertError.message });
    data = newDemo[0];
  }

  const token = jwt.sign(
    { id: data.id, email: data.email, company_name: data.company_name, role: data.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
  res.json({ token, user: { email: data.email, company_name: data.company_name, role: data.role } });
});

module.exports = router;