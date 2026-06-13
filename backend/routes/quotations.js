const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');

// Helper to generate quote number
async function generateQuoteNumber() {
  const { data, error } = await supabase
    .from('quotations')
    .select('quote_number')
    .order('quote_number', { ascending: false })
    .limit(1);
  if (error || !data.length) return 'QUO-2026-0001';
  const lastNum = parseInt(data[0].quote_number.split('-')[2]);
  const nextNum = lastNum + 1;
  const year = new Date().getFullYear();
  return `QUO-${year}-${String(nextNum).padStart(4, '0')}`;
}

// Get all quotations
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    for (const quote of data) {
      const { data: items, error: itemsErr } = await supabase
        .from('quotation_line_items')
        .select('*')
        .eq('quotation_id', quote.id);
      if (!itemsErr) quote.line_items = items || [];
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single quotation
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: quote, error: quoteErr } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', id)
      .single();
    if (quoteErr) throw quoteErr;
    const { data: items, error: itemsErr } = await supabase
      .from('quotation_line_items')
      .select('*')
      .eq('quotation_id', id);
    if (!itemsErr) quote.line_items = items || [];
    res.json(quote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create quotation
router.post('/', async (req, res) => {
  try {
    const { client_id, site_id, date, valid_until, line_items, notes } = req.body;
    if (!client_id || !date) throw new Error('Missing required fields');
    const quote_number = await generateQuoteNumber();
    let subtotal = 0;
    const items = line_items || [];
    for (const item of items) {
      subtotal += (item.quantity || 0) * (item.unit_price || 0);
    }
    const vat = subtotal * 0.05;
    const total = subtotal + vat;
    const { data: quote, error: quoteErr } = await supabase
      .from('quotations')
      .insert([{ quote_number, client_id, site_id: site_id || null, date, valid_until, status: 'Draft', subtotal, vat, total, notes }])
      .select();
    if (quoteErr) throw quoteErr;
    const quoteId = quote[0].id;
    if (items.length) {
      const lineItemsToInsert = items.map(item => ({
        quotation_id: quoteId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price
      }));
      const { error: lineErr } = await supabase.from('quotation_line_items').insert(lineItemsToInsert);
      if (lineErr) throw lineErr;
    }
    res.status(201).json({ ...quote[0], line_items: items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update quotation status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { data, error } = await supabase
      .from('quotations')
      .update({ status, updated_at: new Date() })
      .eq('id', id)
      .select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Convert quotation to job
router.post('/:id/convert-to-job', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: quote, error: quoteErr } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', id)
      .single();
    if (quoteErr) throw quoteErr;
    if (quote.status !== 'Approved') {
      return res.status(400).json({ error: 'Quote must be approved before converting to job' });
    }
    const description = quote.line_items?.map(i => i.description).join(', ') || quote.notes || 'Work order from quotation';
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .insert([{
        customer_id: quote.client_id,
        customer_name: 'Customer Name', // You may need to fetch this from clients table
        site_id: quote.site_id || null,
        service: description,
        status: 'Assigned',
        priority: 'Medium',
        quotation_id: id
      }])
      .select();
    if (jobErr) throw jobErr;
    await supabase.from('quotations').update({ status: 'Converted' }).eq('id', id);
    res.status(201).json(job[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;