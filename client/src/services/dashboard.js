import api from './api.js';

export const getSummary = () => api.get('/dashboard/summary').then(r => r.data.data);
export const getLedger = (params) => api.get('/dashboard/ledger', { params }).then(r => r.data.data);
export const getTrends = (params) => api.get('/dashboard/trends', { params }).then(r => r.data.data);
export const getCircularity = () => api.get('/dashboard/circularity').then(r => r.data.data);
