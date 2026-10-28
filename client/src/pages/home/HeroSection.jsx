// HeroSection: a white panel with the headline (typed by the typewriter),
// intro, two buttons and three reassurance ticks on the left, and the 3D
// locality map on the right with a floating "recent report" card.

import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import useT from '../../hooks/useT.js';
import { useTypewriter } from '../../hooks/useTypewriter.js';
import { STATUS_CLASS, timeAgo } from '../../utils/issueMath.js';

export default function HeroSection({ issue, start }) {
  const t = useT();
  const headline = t('hero.title'); // "\n" marks line breaks; CSS (pre-line) shows them
  const typedRef = useRef(null);
  const [done, setDone] = useState(false);

  useTypewriter(typedRef, headline, { start, speed: 45, startDelay: 300, onDone: () => setDone(true) });

  return (
    <section className="lp-hero container-xl" aria-labelledby="hero-title">
      <div className="lp-hero__panel">
        <div className="lp-hero__copy">
          <span className="cf-eyebrow" data-reveal><Icon name="shield" size={14} /> {t('hero.eyebrow')}</span>
          {/* Screen readers read the hidden copy once; the typed layer is aria-hidden. */}
          <h1 id="hero-title" className="lp-hero__title" data-reveal>
            <span className="visually-hidden">{headline.replace(/\n/g, ' ')}</span>
            <span className={`cf-type${done ? ' is-done' : ''}`} aria-hidden="true">
              <span className="cf-type__ghost">{headline}</span>
              <span><span ref={typedRef} /><span className="cf-caret" /></span>
            </span>
          </h1>
          <p className="cf-lead m-0" data-reveal>{t('hero.lead')}</p>
          <div className="d-flex flex-wrap gap-2" data-reveal>
            <Link className="btn btn-primary btn-lg" to="/report">
              {t('nav.report')} <span className="cf-arrow" aria-hidden="true">→</span>
            </Link>
            <Link className="btn btn-ghost btn-lg" to="/track">{t('nav.track')}</Link>
          </div>
          <ul className="cf-ticks" data-reveal>
            <li><Icon name="check" size={16} /> {t('hero.tick1')}</li>
            <li><Icon name="check" size={16} /> {t('hero.tick2')}</li>
            <li><Icon name="check" size={16} /> {t('hero.tick3')}</li>
          </ul>
        </div>

        <div className="lp-hero__media">
          <img
            className="lp-hero__map"
            src="/images/01-3d-locality-map.png"
            alt="Aerial 3D view of a green neighbourhood with red pins marking reported issues"
            fetchPriority="high"
          />
          <Link to={`/issues/${issue.complaintId}`} className="lp-hero-card cf-float" data-reveal="scale">
            <img src={issue.imageUrls[0]} alt="" />
            <span className="lp-hero-card__body">
              <strong>{issue.title}</strong>
              <span>{issue.location.city}, {issue.location.district}</span>
              <span>Reported {timeAgo(issue.createdAt)}</span>
              <span className={`cf-chip cf-status ${STATUS_CLASS[issue.status]} mt-1`}>{issue.status}</span>
            </span>
            <Icon name="arrow" size={16} className="lp-hero-card__go" />
          </Link>
        </div>
      </div>
    </section>
  );
}
