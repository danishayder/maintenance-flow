const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');

// Get all assets (with company filter and client/site details)
router.get('/', async (req, res) => {
  try {
    let query = supabase.from('assets').select('*, clients(name), sites(id, name)');
    
    // Apply company filter if available
    if (req.user && req.user.company_id) {
      query = query.eq('company_id', req.user.company_id);
    }
    
    if (req.query.client_id) {
      query = query.eq('client_id', req.query.client_id);
    }
    
    if (req.query.status) {
      query = query.eq('status', req.query.status);
    }
    
    const { data, error } = await query.order('name');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single asset with linked jobs and maintenance history
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: asset, error: assetErr } = await supabase
      .from('assets')
      .select('*, clients(name), sites(id, name)')
      .eq('id', id)
      .single();
    if (assetErr) throw assetErr;
    
    const { data: jobs, error: jobsErr } = await supabase
      .from('jobs')
      .select('*')
      .eq('asset_id', id)
      .order('created_at', { ascending: false });
    if (jobsErr) throw jobsErr;
    
    // Get maintenance history (jobs with completion notes)
    const maintenanceHistory = jobs.filter(j => j.status === 'Completed' && j.completion_notes);
    
    res.json({ ...asset, jobs, maintenance_history: maintenanceHistory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create asset
router.post('/', async (req, res) => {
  try {
    const { 
      client_id, site_id, asset_code, name, type, 
      manufacturer, model, serial_number, installation_date, 
      warranty_expiry, status, notes, company_id 
    } = req.body;
    
    const { data, error } = await supabase
      .from('assets')
      .insert([{ 
        client_id, site_id, asset_code, name, type, 
        manufacturer, model, serial_number, installation_date, 
        warranty_expiry, status: status || 'Active', notes,
        company_id: req.user?.company_id || company_id
      }])
      .select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update asset
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    updates.updated_at = new Date();
    
    let query = supabase.from('assets').update(updates).eq('id', id);
    if (req.user && req.user.company_id) {
      query = query.eq('company_id', req.user.company_id);
    }
    
    const { data, error } = await query.select();
    if (error) throw error;
    if (data.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete asset
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let query = supabase.from('assets').delete().eq('id', id);
    if (req.user && req.user.company_id) {
      query = query.eq('company_id', req.user.company_id);
    }
    const { error } = await query;
    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get asset statistics
router.get('/stats', async (req, res) => {
  try {
    let query = supabase.from('assets').select('*', { count: 'exact' });
    if (req.user && req.user.company_id) {
      query = query.eq('company_id', req.user.company_id);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    const stats = {
      total: data.length,
      active: data.filter(a => a.status === 'Active').length,
      inactive: data.filter(a => a.status === 'Inactive').length,
      by_type: data.reduce((acc, a) => {
        const type = a.type || a.asset_type || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {})
    };
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;