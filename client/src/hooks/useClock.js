// hooks/useClock.js
// Returns the current time in India ("IST 16:42"), updated every 15 seconds.

import { useEffect, useState } from 'react';

const format = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

export default function useClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  return `IST ${format.format(now)}`;
}
