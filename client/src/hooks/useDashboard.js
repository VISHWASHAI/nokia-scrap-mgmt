import { useState, useEffect } from 'react';
import * as svc from '../services/dashboard.js';

function useFetch(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fn()
      .then(res => { if (!cancelled) setData(res); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, deps);

  return { data, loading, error };
}

export const useSummary = () => useFetch(svc.getSummary);
export const useTrends = (days = 30, category) =>
  useFetch(() => svc.getTrends({ days, category: category || undefined }), [days, category]);
export const useCircularity = () => useFetch(svc.getCircularity);
export const useLedgerData = (params) => useFetch(() => svc.getLedger(params), [JSON.stringify(params)]);
