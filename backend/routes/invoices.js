const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');

// Get all invoices with their line items
router.get('/', async (req, res) => {
  try {
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .order('date', { ascending: false });
    
    if (invoicesError) throw invoicesError;
    
    const { data: lineItems, error: lineError } = await supabase
      .from('invoice_line_items')
      .select('*');
    
    if (lineError && lineError.message.includes('does not exist')) {
      return res.json(invoices);
    }
    if (lineError) throw lineError;
    
    const invoicesWithItems = invoices.map(inv => ({
      ...inv,
      line_items: lineItems?.filter(item => item.invoice_id === inv.id) || []
    }));
    
    res.json(invoicesWithItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single invoice with line items
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();
    
    if (invError) throw invError;
    
    const { data: lineItems, error: lineError } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', id);
    
    if (lineError && !lineError.message.includes('does not exist')) throw lineError;
    
    res.json({ ...invoice, line_items: lineItems || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create invoice with line items
router.post('/', async (req, res) => {
  try {
    const { 
      client_name, 
      description, 
      date, 
      due_date, 
      line_items = [],
      payment_terms = 'Due on Receipt',
      trn_number,
      reference,
      status = 'Pending'
    } = req.body;
    
    // Calculate totals
    const subtotal = line_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const vat_amount = subtotal * 0.05;
    const total = subtotal + vat_amount;
    
    // Generate invoice number
    const year = new Date(date || new Date()).getFullYear();
    const { data: lastInvoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .ilike('invoice_number', `INV-${year}-%`)
      .order('invoice_number', { ascending: false })
      .limit(1);
    
    let nextNum = 1;
    if (lastInvoice && lastInvoice.length > 0) {
      const lastNum = parseInt(lastInvoice[0].invoice_number.split('-')[2]);
      nextNum = lastNum + 1;
    }
    const invoice_number = `INV-${year}-${String(nextNum).padStart(4, '0')}`;
    
    // Insert invoice
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .insert([{
        invoice_number,
        client_name,
        description: description || line_items.map(i => i.description).join(', '),
        date: date || new Date().toISOString().slice(0,10),
        due_date: due_date || null,
        subtotal,
        vat_rate: 5,
        vat_amount,
        total,
        payment_terms,
        trn_number,
        reference,
        status
      }])
      .select();
    
    if (invError) throw invError;
    
    const invoiceId = invoice[0].id;
    
    // Insert line items if table exists
    if (line_items.length > 0) {
      try {
        const lineItemsToInsert = line_items.map(item => ({
          invoice_id: invoiceId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price,
          notes: item.notes || null
        }));
        
        const { error: lineError } = await supabase
          .from('invoice_line_items')
          .insert(lineItemsToInsert);
        
        if (lineError && !lineError.message.includes('does not exist')) throw lineError;
      } catch (lineErr) {
        console.log('Line items table error:', lineErr.message);
      }
    }
    
    res.status(201).json({ ...invoice[0], line_items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update invoice status (e.g., mark as Paid)
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const { data, error } = await supabase
      .from('invoices')
      .update({ status, updated_at: new Date() })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete invoice (cascade deletes line items automatically due to ON DELETE CASCADE)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;