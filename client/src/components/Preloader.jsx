// Preloader: a full-screen cream cover with a percentage counter.
// It counts up to 90% on its own, waits until the fonts, the page and the
// hero image have loaded, then runs to 100% and fades away. A timeout
// guarantees it never gets stuck, even if something fails to load.

import { useEffect, useRef, useState } from 'react';

const MAX_WAIT_MS = 3500;
const HERO_IMAGE = '/images/01-3d-locality-map.png';

export default function Preloader({ onDone }) {
  const [percent, setPercent] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let shown = 0;
    let ready = false;
    let finished = false;
    let leaveTimer = null;
    let doneTimer = null;
    const markReady = () => { ready = true; };

    // Fonts loaded + window "load" + hero image decoded = ready.
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    const pageLoaded = document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));
    const heroLoaded = new Promise((resolve) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = resolve; // a missing image must not block the site
      img.src = HERO_IMAGE;
    });
    Promise.all([fontsReady, pageLoaded, heroLoaded]).then(markReady, markReady);
    const guard = setTimeout(markReady, MAX_WAIT_MS);

    // Every 30 ms, creep forward (slowly until ready, quickly after).
    const tick = setInterval(() => {
      const cap = ready ? 100 : 90;
      if (shown < cap) {
        shown = Math.min(cap, shown + (ready ? 7 : 1 + Math.random() * 2.5));
        setPercent(Math.floor(shown));
      }
      if (shown >= 100 && !finished) {
        finished = true;
        clearInterval(tick);
        leaveTimer = setTimeout(() => setLeaving(true), 200);
        // The fade takes 0.6 s; finish even if transitionend never fires.
        doneTimer = setTimeout(() => onDoneRef.current(), 200 + 650);
      }
    }, 30);

    return () => {
      clearInterval(tick);
      clearTimeout(guard);
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  return (
    <div className={`cf-preloader${leaving ? ' is-leaving' : ''}`} role="status">
      <span className="visually-hidden">Loading CivicFix</span>
      <div className="cf-preloader__inner" aria-hidden="true">
        <span className="cf-wordmark">CivicFix</span>
        <div className="cf-preloader__num">{percent}%</div>
        <div className="cf-preloader__bar">
          <div className="cf-preloader__fill" style={{ transform: `scaleX(${percent / 100})` }} />
        </div>
      </div>
    </div>
  );
}
