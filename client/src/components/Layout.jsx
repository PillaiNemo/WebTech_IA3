// Layout: wraps every page with the preloader, the scroll progress bar, the
// accessibility bar, the header, the side navigation and the footer, and
// provides app-wide settings (language, theme) through AppContext.
// <Outlet /> is where React Router draws the page.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppContext from '../context/AppContext.js';
import CivicUI from '../lib/civicui.js';
import en from '../data/i18n/en.json';
import hi from '../data/i18n/hi.json';
import Preloader from './Preloader.jsx';
import UtilityBar from './UtilityBar.jsx';
import SiteNav from './SiteNav.jsx';
import SideNav from './SideNav.jsx';
import SiteFooter from './SiteFooter.jsx';

const STRINGS = { en, hi };
const LANG_KEY = 'cf-lang';

function readLang() {
  try {
    return localStorage.getItem(LANG_KEY) === 'hi' ? 'hi' : 'en';
  } catch {
    return 'en';
  }
}

export default function Layout() {
  const location = useLocation();
  const [booted, setBooted] = useState(false);
  const [lang, setLangState] = useState(readLang);
  const [theme, setTheme] = useState(() => CivicUI.getTheme());
  const progressRef = useRef(null);

  const finishPreloader = useCallback(() => setBooted(true), []);

  const setLang = useCallback((next) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      // storage blocked: the choice lasts for this visit only
    }
  }, []);

  const toggleTheme = useCallback(() => {
    CivicUI.toggleTheme(); // smooth colour change + remembers the choice
    setTheme(CivicUI.getTheme());
  }, []);

  // t('nav.home') -> the string in the current language (English as fallback).
  // "{n}" placeholders are filled from vars: t('explore.results', { n: 12 }).
  const t = useCallback((key, vars) => {
    let text = STRINGS[lang][key] ?? en[key] ?? key;
    if (vars) Object.keys(vars).forEach((name) => { text = text.replace(`{${name}}`, vars[name]); });
    return text;
  }, [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Click ripple on every button, and the scroll-depth bar.
  useEffect(() => CivicUI.initRipple(), []);
  useEffect(() => CivicUI.initScrollProgress(progressRef.current), []);

  // A new page starts at the top; links such as "/#how" scroll to that section.
  useEffect(() => {
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView({ behavior: CivicUI.prefersReducedMotion() ? 'auto' : 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location.pathname, location.hash, booted]);

  // useMemo: consumers only re-render when one of these values changes.
  const context = useMemo(
    () => ({ booted, lang, setLang, t, theme, toggleTheme }),
    [booted, lang, setLang, t, theme, toggleTheme]
  );

  return (
    <AppContext.Provider value={context}>
      <div ref={progressRef} className="cf-progress" aria-hidden="true" />
      {!booted && <Preloader onDone={finishPreloader} />}

      <UtilityBar />
      <SiteNav />

      <div className="cf-shell">
        <SideNav />
        <div className="cf-shell__main">
          {/* key = path, so each new page fades in */}
          <main id="main" key={location.pathname} className="cf-route-fade" tabIndex={-1}>
            <Outlet />
          </main>
        </div>
      </div>

      <SiteFooter />
    </AppContext.Provider>
  );
}
