// SiteFooter: the dark footer with the logo, link lists and the live IST clock.
// About and Contact are the plain HTML pages in /static (served by Express).

import { Link } from 'react-router-dom';
import useClock from '../hooks/useClock.js';
import useT from '../hooks/useT.js';

export default function SiteFooter() {
  const clock = useClock();
  const t = useT();

  const columns = [
    {
      title: t('footer.citizens'),
      links: [
        { to: '/report', label: t('nav.report') },
        { to: '/track', label: t('nav.track') },
        { to: '/issues', label: t('nav.explore') },
        { to: '/impact', label: t('nav.impact') }
      ]
    },
    {
      title: 'CivicFix',
      links: [
        { href: '/static/how-it-works.html', label: t('nav.how') },
        { href: '/static/about.html', label: t('footer.about') },
        { href: '/static/contact.html', label: t('footer.contact') },
        { to: '/admin', label: t('footer.admin') }
      ]
    }
  ];

  return (
    <footer className="cf-footer">
      <div className="container-xl">
        <div className="row g-4">
          <div className="col-lg-5">
            <Link className="cf-wordmark" to="/">CivicFix</Link>
            <p className="cf-small mt-2 mb-0" style={{ maxWidth: '34ch' }}>{t('footer.tagline')}</p>
          </div>
          {columns.map((col) => (
            <div className="col-6 col-lg-3" key={col.title}>
              <p className="cf-label mb-3">{col.title}</p>
              <ul className="cf-footer__links">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href
                      ? <a className="cf-ulink" href={link.href}>{link.label}</a>
                      : <Link className="cf-ulink" to={link.to}>{link.label}</Link>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="cf-footer__bottom">
          <span>{t('footer.copy')}</span>
          <span className="cf-mono" aria-label="Current time in India">{clock}</span>
        </div>
      </div>
    </footer>
  );
}
