// QuickServices: "What would you like to do?", four service tiles that link
// to the main parts of the site, each with its own icon and colour.

import { Link } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import useT from '../../hooks/useT.js';

const SERVICES = [
  { to: '/report', icon: 'file', tone: '', titleKey: 'nav.report', textKey: 'services.report' },
  { to: '/track', icon: 'route', tone: 'blue', titleKey: 'nav.track', textKey: 'services.track' },
  { to: '/issues', icon: 'map', tone: 'sage', titleKey: 'nav.explore', textKey: 'services.explore' },
  { to: '/impact', icon: 'chart', tone: 'amber', titleKey: 'nav.impact', textKey: 'services.impact' }
];

export default function QuickServices() {
  const t = useT();

  return (
    <section className="lp-block container-xl" aria-labelledby="services-title">
      <h2 id="services-title" className="lp-block__title" data-reveal>{t('services.title')}</h2>
      <ul className="lp-services" data-stagger>
        {SERVICES.map((s) => (
          <li key={s.to} data-reveal>
            <Link className={`cf-tile${s.tone ? ` cf-tile--${s.tone}` : ''}`} to={s.to}>
              <span className="cf-tile__icon"><Icon name={s.icon} size={22} /></span>
              <span className="cf-tile__title">{t(s.titleKey)} <Icon name="arrow" size={16} /></span>
              <span className="cf-tile__text">{t(s.textKey)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
