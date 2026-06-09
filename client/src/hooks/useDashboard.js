import { useState, useEffect } from 'react';
import * as svc from '../services/dashboard.js';
import { resolveCategories } from '../constants/wasteCategories.js';

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

export const useTrends = (days = 30, material) => {
  const cats = resolveCategories(material);
  const params = { days };
  if (cats.length === 1) params.category = cats[0];
  else if (cats.length > 1) params.categories = cats;
  return useFetch(() => svc.getTrends(params), [days, material]);
};

export const useCircularity = () => useFetch(svc.getCircularity);
export const useLedgerData = (params) => useFetch(() => svc.getLedger(params), [JSON.stringify(params)]);
