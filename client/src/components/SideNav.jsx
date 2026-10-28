// SideNav: the side navigation on large screens, a list of links in two
// groups ("Citizen services", "Information") with an icon per link.
// NavGroups is shared with the mobile menu (MenuOverlay).

import { Link, NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';
import useT from '../hooks/useT.js';
import { NAV_GROUPS } from '../data/navLinks.js';

// idPrefix keeps the heading ids unique, as both copies are in the page.
export function NavGroups({ onNavigate, idPrefix = 'side' }) {
  const t = useT();

  return NAV_GROUPS.map((group, g) => (
    <div className="cf-side__group" key={group.titleKey}>
      {g > 0 && <div className="cf-side__rule mb-3" aria-hidden="true" />}
      <h2 className="cf-side__title" id={`${idPrefix}-${g}`}>{t(group.titleKey)}</h2>
      <ul className="cf-side__list" aria-labelledby={`${idPrefix}-${g}`}>
        {group.links.map((link) => {
          const content = <><Icon name={link.icon} size={18} /> {t(link.labelKey)}</>;
          let item;
          if (link.href) item = <a className="cf-side__link" href={link.href}>{content}</a>;
          else if (link.hashLink) item = <Link className="cf-side__link" to={link.to} onClick={onNavigate}>{content}</Link>;
          else item = <NavLink className="cf-side__link" to={link.to} end={link.end} onClick={onNavigate}>{content}</NavLink>;
          return <li key={link.labelKey}>{item}</li>;
        })}
      </ul>
    </div>
  ));
}

export default function SideNav() {
  const t = useT();

  return (
    <aside className="cf-side d-none d-lg-block">
      <nav className="cf-side__inner" aria-label={t('side.label')}>
        <NavGroups />
        <p className="cf-side__note mb-0">
          <strong>{t('side.emergency')}</strong>
          <span>{t('side.emergencyText')}</span>
        </p>
      </nav>
    </aside>
  );
}
