// Logo: the CivicFix mark (a map pin with a tick on a maroon tile) with the
// name and tagline. ThemeIcon: the sun that turns into a moon in dark mode.
// Kept in their own file so the header, the menu and the accessibility bar
// can all use them without importing each other.

import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import useT from '../hooks/useT.js';

export default function Logo({ onClick }) {
  const t = useT();
  return (
    <Link className="cf-logo" to="/" onClick={onClick}>
      <span className="cf-logo__mark"><Icon name="pin-check" size={24} /></span>
      <span className="cf-logo__text">
        <span className="cf-logo__name">CivicFix</span>
        <span className="cf-logo__tag">{t('header.tagline')}</span>
      </span>
    </Link>
  );
}

export function ThemeIcon() {
  return (
    <svg className="cf-theme-icon" viewBox="0 0 24 24" aria-hidden="true">
      <mask id="cf-moon-mask">
        <rect width="24" height="24" fill="#fff" />
        <circle className="cf-moon-mask" cx="24" cy="4" r="7" fill="#000" />
      </mask>
      <circle cx="12" cy="12" r="5.5" fill="currentColor" mask="url(#cf-moon-mask)" />
      <g className="cf-sun-rays" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 1.5v2.2M12 20.3v2.2M1.5 12h2.2M20.3 12h2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" />
      </g>
    </svg>
  );
}
