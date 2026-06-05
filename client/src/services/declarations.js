import api from './api.js';

export const createDeclaration = (body) => api.post('/declarations', body).then(r => r.data.data);
export const getDeclarations = (params) => api.get('/declarations', { params }).then(r => r.data.data);
export const getDeclaration = (id) => api.get(`/declarations/${id}`).then(r => r.data.data);
export const submitDeclaration = (id) => api.patch(`/declarations/${id}/submit`).then(r => r.data.data);
export const approveDeclaration = (id) => api.patch(`/declarations/${id}/approve`).then(r => r.data.data);
export const downloadExcel = (params) =>
  api.get('/declarations/export/excel', { params, responseType: 'blob' }).then(r => r.data);
