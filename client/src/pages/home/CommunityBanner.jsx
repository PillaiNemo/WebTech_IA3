// CommunityBanner: the deep green call to action with the town-hall sketch.

import { Link } from 'react-router-dom';
import useT from '../../hooks/useT.js';

export default function CommunityBanner() {
  const t = useT();

  return (
    <section className="lp-block lp-banner-wrap container-xl" aria-labelledby="banner-title">
      <div className="cf-banner lp-banner" data-reveal="scale">
        <img className="lp-banner__art" src="/images/03-architectural-line-art.png" alt="" />
        <div className="lp-banner__copy">
          <h2 id="banner-title" className="lp-block__title mb-3" style={{ whiteSpace: 'pre-line' }}>{t('banner.title')}</h2>
          <p className="mb-4">{t('banner.text')}</p>
          <Link className="btn btn-light btn-lg" to="/report">
            {t('nav.report')} <span className="cf-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
