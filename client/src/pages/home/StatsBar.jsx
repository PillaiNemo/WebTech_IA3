// StatsBar: four headline numbers that count up (jQuery) once they are seen.

import { useRef } from 'react';
import Counter from '../../components/Counter.jsx';
import Icon from '../../components/Icon.jsx';
import useInView from '../../hooks/useInView.js';
import useT from '../../hooks/useT.js';

export default function StatsBar({ stats }) {
  const t = useT();
  const ref = useRef(null);
  const seen = useInView(ref);

  const items = [
    { label: t('stats.reported'), value: stats.totalReported, icon: 'file' },
    { label: t('stats.resolved'), value: stats.resolved, icon: 'check' },
    { label: t('stats.localities'), value: stats.activeLocalities, icon: 'pin' },
    { label: t('stats.avg'), value: stats.avgResolutionDays, decimals: 1, suffix: t('stats.days'), icon: 'clock' }
  ];

  return (
    <section className="lp-stats container-xl" id="impact" aria-label="CivicFix in numbers" ref={ref}>
      <dl className="lp-stats__grid">
        {items.map((item) => (
          <div className="lp-stats__item" key={item.label}>
            <dt className="lp-stats__label"><Icon name={item.icon} size={16} /> {item.label}</dt>
            <dd className="cf-stat__num m-0">
              <Counter value={item.value} decimals={item.decimals} suffix={item.suffix} run={seen} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
