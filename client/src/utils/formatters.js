export const fmtKg = (v) => `${Number(v ?? 0).toFixed(2)} kg`;
export const fmtNum = (v) => Number(v ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
export const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
export const fnLabel = (fn) => {
  const map = { SMT: 'SMT', MFT: 'MFT', REPAIR: 'Repair', RFM: 'RFM', FILTER: 'Filter', SQ: 'SQ' };
  return map[fn] ?? fn;
};
