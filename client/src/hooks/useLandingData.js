// hooks/useLandingData.js
// The home page renders straight away with the sample data from
// data/landing.json, then asks the API for live numbers and the newest
// issues with photos. If the backend is not running, the sample data stays.

import { useEffect, useState } from 'react';
import sample from '../data/landing.json';
import { getJSON } from '../services/api.js';

export default function useLandingData() {
  const [data, setData] = useState({
    stats: sample.stats,
    issues: sample.featuredIssues,
    source: 'sample'
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [stats, list] = await Promise.all([
          getJSON('/api/stats', { timeout: 2500 }),
          getJSON('/api/issues?sort=newest&limit=24', { timeout: 2500 })
        ]);
        // Prefer recent issues that have a photo, like the design shows.
        const withPhotos = list.items.filter((i) => i.imageUrls.length);
        const issues = [...withPhotos, ...list.items.filter((i) => !i.imageUrls.length)].slice(0, 3);
        if (!cancelled && issues.length) setData({ stats: { ...sample.stats, ...stats }, issues, source: 'live' });
      } catch {
        // Backend not available: keep showing the sample data.
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
