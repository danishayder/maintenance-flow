const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');

// Get all visits for a specific AMC
router.get('/amc/:amcId', async (req, res) => {
  try {
    const { amcId } = req.params;
    const { data, error } = await supabase
      .from('amc_visits')
      .select('*')
      .eq('amc_id', amcId)
      .order('visit_date', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new visit log
router.post('/', async (req, res) => {
  try {
    const { amc_id, visit_date, technician, tasks_completed, notes, hours_spent } = req.body;
    
    const { data, error } = await supabase
      .from('amc_visits')
      .insert([{
        amc_id,
        visit_date,
        technician,
        tasks_completed,
        notes,
        hours_spent
      }])
      .select();
      
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a visit log (optional)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('amc_visits')
      .delete()
      .eq('id', id);
    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;