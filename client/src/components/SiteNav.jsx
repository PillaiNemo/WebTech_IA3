// SiteNav: the sticky white header: logo, a search box for complaints,
// "Track Complaint" and "Report an Issue". On small screens the menu button
// opens the side navigation as a full-screen menu.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import Logo from './Logo.jsx';
import MenuOverlay from './MenuOverlay.jsx';
import useT from '../hooks/useT.js';

export default function SiteNav() {
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const toggleRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // useCallback keeps the same function between renders, so the menu's
  // focus-trap effect does not restart every time this component re-renders.
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Close the menu whenever the page changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  // Searching from the header opens Explore with the search filled in.
  function onSearch(e) {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/issues?q=${encodeURIComponent(q)}` : '/issues');
    setQuery('');
  }

  return (
    <>
      <header className="cf-header">
        <Logo />

        <form className="cf-search cf-header__search" role="search" onSubmit={onSearch}>
          <Icon name="search" />
          <label className="visually-hidden" htmlFor="header-search">{t('header.searchLabel')}</label>
          <input
            id="header-search"
            className="form-control"
            type="search"
            placeholder={t('header.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

        <div className="cf-header__actions">
          <Link className="btn btn-ghost d-none d-md-inline-flex" to="/track">{t('nav.track')}</Link>
          <Link className="btn btn-primary d-none d-sm-inline-flex" to="/report"><Icon name="plus" size={16} /> {t('nav.report')}</Link>
          <button
            ref={toggleRef}
            className="cf-burger d-lg-none"
            type="button"
            aria-label={t('nav.open')}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpen(true)}
          >
            <span />
            <span />
          </button>
        </div>
      </header>

      {/* Rendered outside <header>, so the fixed menu is not limited to the header's box. */}
      <MenuOverlay open={menuOpen} onClose={closeMenu} returnFocusRef={toggleRef} />
    </>
  );
}
