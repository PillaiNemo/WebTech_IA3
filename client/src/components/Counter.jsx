// Counter: a number that counts up with jQuery's .animate() (see
// static/js/civicfix-jquery.js). `run` starts it; setting it back to false
// resets to zero so it replays the next time.
//
// React renders the animated <span> empty and lets jQuery own its text.
// Screen readers get the final value from a visually hidden copy instead of
// hearing every in-between number.

import { useEffect, useRef } from 'react';
import $ from '../lib/jquery.js';

export default function Counter({ value, pad = 0, decimals = 0, suffix = '', run = true, duration = 1800 }) {
  const ref = useRef(null);

  useEffect(() => {
    const $el = $(ref.current);
    if (run) $el.cfCountUp({ duration });
    else $el.cfCountReset();
    return () => $el.cfCountReset();
  }, [run, value, pad, decimals, suffix, duration]);

  return (
    <>
      <span className="visually-hidden">{$.cfFormatNumber(value, pad, decimals) + suffix}</span>
      <span
        ref={ref}
        aria-hidden="true"
        data-count={value}
        data-pad={pad}
        data-decimals={decimals}
        data-suffix={suffix}
      />
    </>
  );
}
