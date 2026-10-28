// hooks/useTypewriter.js
// React wrapper around the vanilla typewriter in CivicUI.
// The text is written straight into the DOM node behind `ref`, so React
// re-renders never interrupt the typing. That node must render no children.

import { useEffect, useRef } from 'react';
import CivicUI from '../lib/civicui.js';

// Types `text` once, then calls onDone.
export function useTypewriter(ref, text, { start = true, speed = 60, startDelay = 0, onDone } = {}) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!start || !ref.current) return undefined;
    return CivicUI.typewriter(ref.current, text, {
      speed,
      startDelay,
      onDone: () => onDoneRef.current && onDoneRef.current()
    });
  }, [ref, text, start, speed, startDelay]);
}
