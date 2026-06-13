const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');

// Get all sites (optionally filter by customer)
router.get('/', async (req, res) => {
  try {
    let query = supabase.from('sites').select('*');
    if (req.query.customer_id) {
      query = query.eq('customer_id', req.query.customer_id);
    }
    const { data, error } = await query.order('name');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single site
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create site
router.post('/', async (req, res) => {
  try {
    const { customer_id, name, address, contact_person, phone } = req.body;
    const { data, error } = await supabase
      .from('sites')
      .insert([{ customer_id, name, address, contact_person, phone }])
      .select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update site
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { data, error } = await supabase
      .from('sites')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete site
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('sites').delete().eq('id', id);
    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;