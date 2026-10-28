// MenuOverlay: the mobile menu, the side navigation sliding in from the left.
// Accessibility: it is a modal dialog, focus moves into it on open and is
// trapped inside (Tab wraps around), Escape closes it, and focus returns to
// the menu button afterwards. While closed it is "inert" (not focusable).

import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import Logo from './Logo.jsx';
import { NavGroups } from './SideNav.jsx';
import useT from '../hooks/useT.js';

export default function MenuOverlay({ open, onClose, returnFocusRef }) {
  const menuRef = useRef(null);
  const t = useT();

  useEffect(() => {
    if (!open) return undefined;

    const root = document.documentElement;
    const menu = menuRef.current;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden'; // stop the page behind from scrolling

    const firstLink = menu.querySelector('.cf-side__link');
    if (firstLink) firstLink.focus();

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(menu.querySelectorAll('a[href], button:not([disabled]):not([tabindex="-1"])'));
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    const toggle = returnFocusRef.current;
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      root.style.overflow = previousOverflow;
      if (toggle) toggle.focus();
    };
  }, [open, onClose, returnFocusRef]);

  return (
    <div
      id="site-menu"
      ref={menuRef}
      className={`cf-menu${open ? ' is-open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      inert={!open}
    >
      <button className="cf-menu__backdrop" type="button" tabIndex={-1} aria-hidden="true" onClick={onClose} />
      <div className="cf-menu__panel">
        <div className="cf-menu__head">
          <Logo onClick={onClose} />
          <button className="cf-burger is-close" type="button" aria-label={t('nav.close')} onClick={onClose}>
            <span />
            <span />
          </button>
        </div>

        <nav className="cf-menu__nav" aria-label="Mobile">
          <NavGroups onNavigate={onClose} idPrefix="menu" />
        </nav>

        <div className="cf-menu__foot">
          <Link className="btn btn-primary w-100" to="/report" onClick={onClose}>
            <Icon name="plus" size={16} /> {t('nav.report')}
          </Link>
          <p className="cf-side__note mb-0 mt-3">
            <strong>{t('side.emergency')}</strong>
            <span>{t('side.emergencyText')}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
