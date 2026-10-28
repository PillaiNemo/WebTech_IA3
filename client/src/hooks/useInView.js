// hooks/useInView.js
// Returns true once the element behind `ref` has scrolled into view
// (IntersectionObserver). Used to start the counters only when they are seen.

import { useEffect, useState } from 'react';

export default function useInView(ref, { threshold = 0.3 } = {}) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!('IntersectionObserver' in window)) {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect(); // only needs to happen once
      }
    }, { threshold });

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, threshold]);

  return inView;
}
