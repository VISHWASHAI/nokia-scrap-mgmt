import api from './api.js';

export const listLedger = (params) => api.get('/ledger', { params }).then(r => r.data.data);
export const createLedgerRow = (body) => api.post('/ledger', body).then(r => r.data.data);
export const updateLedgerRow = (id, body) => api.patch(`/ledger/${id}`, body).then(r => r.data.data);
export const deleteLedgerRow = (id) => api.delete(`/ledger/${id}`).then(r => r.data.data);
