import api from './api.js';

// Upload a PDF for parsing — returns { header, items } (nothing saved yet).
export const parseDisposalInvoice = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/disposal-invoices/parse', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data.data);
};

// Confirm a parsed invoice — persists it and subtracts quantities from the ledger.
export const createDisposalInvoice = (body) =>
  api.post('/disposal-invoices', body).then(r => r.data.data);

export const getDisposalInvoices = (params) =>
  api.get('/disposal-invoices', { params }).then(r => r.data.data);
