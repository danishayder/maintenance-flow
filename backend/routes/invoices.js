const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');

// Get all invoices (with line items)
router.get('/', async (req, res) => {
  try {
    // Get all invoices
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .order('date', { ascending: false });
    
    if (invoicesError) throw invoicesError;
    
    // Get line items for each invoice
    for (const invoice of invoices) {
      const { data: items, error: itemsError } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoice.id);
      
      if (!itemsError) {
        invoice.line_items = items || [];
      } else {
        invoice.line_items = [];
      }
    }
    
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single invoice with line items
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();
    
    if (invoiceError) throw invoiceError;
    
    const { data: items, error: itemsError } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', id);
    
    if (!itemsError) {
      invoice.line_items = items || [];
    }
    
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create invoice with line items
router.post('/', async (req, res) => {
  try {
    const { 
      client_name, 
      site_id, 
      description, 
      date, 
      due_date, 
      status, 
      payment_terms, 
      trn_number, 
      reference,
      line_items,
      subtotal,
      vat_rate,
      vat_amount,
      total
    } = req.body;
    
    // Generate invoice number
    const year = new Date().getFullYear();
    const { data: lastInvoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .order('created_at', { ascending: false })
      .limit(1);
    
    let nextNum = 1;
    if (lastInvoice && lastInvoice.length > 0 && lastInvoice[0].invoice_number) {
      const lastNum = parseInt(lastInvoice[0].invoice_number.split('-')[2]);
      nextNum = lastNum + 1;
    }
    const invoice_number = `INV-${year}-${String(nextNum).padStart(4, '0')}`;
    
    // Calculate totals if not provided
    let finalSubtotal = subtotal || 0;
    let finalVatRate = vat_rate || 5.0;
    let finalVatAmount = vat_amount || 0;
    let finalTotal = total || 0;
    
    if (line_items && line_items.length > 0 && !subtotal) {
      finalSubtotal = line_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      finalVatAmount = finalSubtotal * (finalVatRate / 100);
      finalTotal = finalSubtotal + finalVatAmount;
    }
    
    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert([{
        invoice_number,
        client_name,
        site_id: site_id || null,
        description: description || (line_items ? line_items.map(i => i.description).join(', ') : null),
        amount: finalTotal,
        date: date || new Date().toISOString().slice(0,10),
        due_date: due_date || null,
        status: status || 'Pending',
        payment_terms,
        trn_number,
        reference,
        subtotal: finalSubtotal,
        vat_rate: finalVatRate,
        vat_amount: finalVatAmount,
        total: finalTotal,
        updated_at: new Date()
      }])
      .select();
    
    if (invoiceError) throw invoiceError;
    
    const newInvoice = invoice[0];
    
    // Create line items
    if (line_items && line_items.length > 0) {
      const lineItemsToInsert = line_items.map(item => ({
        invoice_id: newInvoice.id,
        description: item.description,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        total: (item.quantity || 1) * (item.unit_price || 0)
      }));
      
      const { error: itemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItemsToInsert);
      
      if (itemsError) throw itemsError;
    }
    
    res.status(201).json(newInvoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update invoice status
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

// Update invoice (full update)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    updates.updated_at = new Date();
    
    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete invoice (also deletes line items via cascade)
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