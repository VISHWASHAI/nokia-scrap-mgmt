import api from './api.js';

const upload = (path, file, extra = {}) => {
  const fd = new FormData();
  fd.append('file', file);
  for (const [k, v] of Object.entries(extra)) fd.append(k, v);
  return api.post(path, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.data);
};

export const previewLedgerImport = (file) => upload('/ledger-import/preview', file);
export const commitLedgerImport = (file, source) => upload('/ledger-import/commit', file, { source });
