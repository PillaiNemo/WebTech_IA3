// hooks/useReveal.js
// Starts the shared scroll-reveal (CivicUI.initReveal) for everything with
// data-reveal inside `ref` once `enabled` is true, and stops it on unmount.
// `key` restarts it when new content (for example live data) appears.

import { useEffect } from 'react';
import CivicUI from '../lib/civicui.js';

export default function useReveal(ref, { enabled = true, key } = {}) {
  useEffect(() => {
    if (!enabled || !ref.current) return undefined;
    return CivicUI.initReveal(ref.current);
  }, [ref, enabled, key]);
}
