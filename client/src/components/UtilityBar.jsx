// UtilityBar: the dark accessibility bar along the top of every page:
// skip link, text size (A− / A / A+), English / हिन्दी and the theme toggle.

import { useContext, useState } from 'react';
import AppContext from '../context/AppContext.js';
import CivicUI from '../lib/civicui.js';
import { ThemeIcon } from './Logo.jsx';

const SIZES = [
  { id: 'sm', label: 'A−', name: 'Smaller text' },
  { id: 'md', label: 'A', name: 'Normal text' },
  { id: 'lg', label: 'A+', name: 'Larger text' }
];

export default function UtilityBar() {
  const { t, lang, setLang, theme, toggleTheme } = useContext(AppContext);
  const [size, setSize] = useState(() => CivicUI.getTextSize());

  function chooseSize(id) {
    CivicUI.setTextSize(id); // sets data-text on <html> and remembers it
    setSize(id);
  }

  return (
    <div className="cf-utility">
      <a className="cf-utility__skip" href="#main">{t('util.skip')}</a>

      <div className="cf-utility__tools">
        <span className="cf-utility__label" id="text-size-label">{t('util.textSize')}</span>
        <div className="d-flex gap-1" role="group" aria-labelledby="text-size-label">
          {SIZES.map((s) => (
            <button
              key={s.id}
              type="button"
              className="cf-utility__btn"
              aria-pressed={size === s.id}
              aria-label={s.name}
              onClick={() => chooseSize(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <span className="cf-utility__sep" aria-hidden="true" />
        <div className="d-flex" role="group" aria-label="Language">
          <button type="button" className="cf-utility__btn cf-utility__btn--text" lang="en" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
            English
          </button>
          <button type="button" className="cf-utility__btn cf-utility__btn--text" lang="hi" aria-pressed={lang === 'hi'} onClick={() => setLang('hi')}>
            हिन्दी
          </button>
        </div>

        <span className="cf-utility__sep" aria-hidden="true" />
        <button
          type="button"
          className="cf-utility__btn"
          onClick={toggleTheme}
          aria-pressed={theme === 'dark'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <ThemeIcon />
        </button>
      </div>
    </div>
  );
}
