const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');

// Get all jobs
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new job
router.post('/', async (req, res) => {
  try {
    const { customerId, customerName, site_id, contact_id, asset_id, service, technician, priority, status, quotation_id } = req.body;
    const { data, error } = await supabase
      .from('jobs')
      .insert([{
        customer_id: customerId,
        customer_name: customerName,
        site_id: site_id || null,
        contact_id: contact_id || null,
        asset_id: asset_id || null,
        service,
        technician,
        priority,
        status: status || 'Assigned',
        quotation_id: quotation_id || null,
        created_at: new Date(),
        updated_at: new Date()
      }])
      .select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update job (full update with completion notes)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, completion_notes, hours_spent, completed_at, technician, priority, service } = req.body;
    
    const updates = {
      updated_at: new Date()
    };
    
    // Add fields if provided
    if (status !== undefined) updates.status = status;
    if (completion_notes !== undefined) updates.completion_notes = completion_notes;
    if (hours_spent !== undefined) updates.hours_spent = hours_spent;
    if (completed_at !== undefined) updates.completed_at = completed_at;
    if (technician !== undefined) updates.technician = technician;
    if (priority !== undefined) updates.priority = priority;
    if (service !== undefined) updates.service = service;
    
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .select();
      
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update only job status (simpler patch)
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const updates = {
      status,
      updated_at: new Date()
    };
    
    // If status is Completed, add completed_at timestamp
    if (status === 'Completed') {
      updates.completed_at = new Date();
    }
    
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .select();
      
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete job
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;