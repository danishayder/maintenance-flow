const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');

// Get all contacts (optionally filter by customer)
router.get('/', async (req, res) => {
  try {
    let query = supabase.from('contacts').select('*');
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

// Get single contact
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create contact
router.post('/', async (req, res) => {
  try {
    const { customer_id, name, role, phone, email, is_primary } = req.body;
    // If is_primary is true, unset other primary contacts for this customer
    if (is_primary) {
      await supabase.from('contacts').update({ is_primary: false }).eq('customer_id', customer_id);
    }
    const { data, error } = await supabase
      .from('contacts')
      .insert([{ customer_id, name, role, phone, email, is_primary: is_primary || false }])
      .select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update contact
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_id, is_primary } = req.body;
    if (is_primary) {
      await supabase.from('contacts').update({ is_primary: false }).eq('customer_id', customer_id);
    }
    const updates = req.body;
    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete contact
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;