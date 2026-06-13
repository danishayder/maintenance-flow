const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');

// Get all clients (with company filter from auth middleware)
router.get('/', async (req, res) => {
  try {
    let query = supabase.from('clients').select('*');
    
    // If company_id is available from auth, filter by it
    if (req.user && req.user.company_id) {
      query = query.eq('company_id', req.user.company_id);
    }
    
    const { data, error } = await query.order('name');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single client by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let query = supabase.from('clients').select('*').eq('id', id);
    
    if (req.user && req.user.company_id) {
      query = query.eq('company_id', req.user.company_id);
    }
    
    const { data, error } = await query.single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new client with all fields
router.post('/', async (req, res) => {
  try {
    const { 
      name, contact, phone, whatsapp, email, address, 
      area, city, postal_code, country, currency,
      customer_type, trn_number, vat_number, registration_code,
      notes, since_date, status
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Customer name is required' });
    }
    
    const clientData = {
      name,
      contact: contact || null,
      phone: phone || null,
      whatsapp: whatsapp || null,
      email: email || null,
      address: address || null,
      area: area || null,
      city: city || null,
      postal_code: postal_code || null,
      country: country || 'UAE',
      currency: currency || 'AED',
      customer_type: customer_type || null,
      trn_number: trn_number || null,
      vat_number: vat_number || null,
      registration_code: registration_code || null,
      notes: notes || null,
      since_date: since_date || new Date().toISOString().slice(0,10),
      status: status || 'active',
      company_id: req.user?.company_id || null,
      created_at: new Date()
    };
    
    const { data, error } = await supabase
      .from('clients')
      .insert([clientData])
      .select();
      
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update client
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    updates.updated_at = new Date();
    
    let query = supabase.from('clients').update(updates).eq('id', id);
    
    if (req.user && req.user.company_id) {
      query = query.eq('company_id', req.user.company_id);
    }
    
    const { data, error } = await query.select();
    if (error) throw error;
    
    if (data.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete client
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    let query = supabase.from('clients').delete().eq('id', id);
    
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

// Get client statistics (tickets count, AMC count, revenue)
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get jobs/tickets count
    const { count: ticketsCount, error: ticketsError } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', id);
    
    // Get AMC contracts count
    const { count: amcCount, error: amcError } = await supabase
      .from('amcs')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', id);
    
    // Get total revenue from invoices
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('amount')
      .eq('client_name', (await supabase.from('clients').select('name').eq('id', id).single()).data?.name);
    
    const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
    
    res.json({
      tickets: ticketsCount || 0,
      amc_contracts: amcCount || 0,
      total_revenue: totalRevenue
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;