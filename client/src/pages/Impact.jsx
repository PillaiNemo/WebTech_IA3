// Impact.jsx: route "/impact". The dashboard: totals, resolution rate (CSS
// ring), top categories (CSS bars), the five most-ignored districts and a
// resolution-rate leaderboard. No chart library: charts are CSS only.

import { useCallback, useEffect, useRef, useState } from 'react';
import Counter from '../components/Counter.jsx';
import { ErrorState, PageHeader } from '../components/States.jsx';
import useReveal from '../hooks/useReveal.js';
import useT from '../hooks/useT.js';
import { getJSON } from '../services/api.js';
import { categoryInfo } from '../utils/issueMath.js';

const BAR_COLORS = ['var(--cf-maroon)', 'var(--cf-sage-mid)', '#46546B', '#B7791F', '#3B5F7C', '#7C7393', '#9A4A33', '#5E564C'];

export default function Impact() {
  const t = useT();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const pageRef = useRef(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setStats(await getJSON('/api/stats'));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useReveal(pageRef, { enabled: !!stats, key: stats });

  const maxCategory = stats ? Math.max(1, ...stats.topCategories.map((c) => c.count)) : 1;
  const maxIgnored = stats ? Math.max(1, ...stats.mostIgnoredDistricts.map((d) => d.avgDaysIgnored)) : 1;

  return (
    <section className="cf-section pt-4" ref={pageRef}>
      <div className="container-xl">
        <PageHeader title={t('impact.title')} text={t('impact.sub')} />

        {error && <ErrorState message={error} onRetry={load} />}
        {!stats && !error && <div className="cf-skel" style={{ height: 420 }} aria-label={t('common.loading')} />}

        {stats && (
          <>
            <dl className="lp-stats__grid cf-panel p-0 mb-4">
              {[
                { label: t('stats.reported'), value: stats.totalReported },
                { label: t('stats.resolved'), value: stats.resolved },
                { label: 'Open now', value: stats.open },
                { label: t('stats.avg'), value: stats.avgResolutionDays, decimals: 1, suffix: t('stats.days') }
              ].map((item) => (
                <div className="lp-stats__item" key={item.label}>
                  <dt className="lp-stats__label">{item.label}</dt>
                  <dd className="cf-stat__num m-0"><Counter value={item.value} decimals={item.decimals} suffix={item.suffix} /></dd>
                </div>
              ))}
            </dl>

            <div className="row g-4">
              <div className="col-lg-7">
                <div className="cf-panel h-100" data-reveal data-inview>
                  <h2 className="cf-h3 mb-4">Top categories</h2>
                  <ul className="cf-bars">
                    {stats.topCategories.map((c, i) => (
                      <li key={c.category} style={{ '--i': i }}>
                        <div className="cf-bar__head"><span>{categoryInfo(c.category).label}</span><span>{c.count}</span></div>
                        <div className="cf-bar__track"><div className="cf-bar__fill" style={{ '--value': (c.count / maxCategory) * 100, '--bar-color': BAR_COLORS[i % BAR_COLORS.length] }} /></div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="col-lg-5">
                <div className="cf-panel h-100 d-flex flex-column align-items-center justify-content-center text-center" data-reveal data-inview>
                  <h2 className="cf-h3 mb-4">Resolution rate</h2>
                  <div className="cf-ring-wrap" style={{ '--value': stats.resolutionRate, '--size': '190px', '--thick': '16px' }}>
                    <div className="cf-ring" role="img" aria-label={`${stats.resolutionRate} percent of issues resolved`} />
                    <div className="cf-ring__label" aria-hidden="true"><span className="cf-ring__num">{stats.resolutionRate}%</span><span className="cf-small cf-muted">resolved</span></div>
                  </div>
                  <ul className="cf-status-legend mt-4">
                    {Object.entries(stats.byStatus).map(([name, count]) => <li key={name}><strong>{count}</strong> {name}</li>)}
                  </ul>
                </div>
              </div>

              <div className="col-lg-6">
                <div className="cf-panel h-100" data-reveal data-inview>
                  <h2 className="cf-h3 mb-1">Most-ignored districts</h2>
                  <p className="cf-small cf-muted mb-4">Average age of open issues, in days.</p>
                  <ol className="cf-bars cf-bars--ranked">
                    {stats.mostIgnoredDistricts.map((d, i) => (
                      <li key={`${d.district}-${d.state}`} style={{ '--i': i }}>
                        <div className="cf-bar__head"><span>{i + 1}. {d.district}, {d.state} <span className="cf-muted">· {d.open} open</span></span><span>{d.avgDaysIgnored} days</span></div>
                        <div className="cf-bar__track"><div className="cf-bar__fill" style={{ '--value': (d.avgDaysIgnored / maxIgnored) * 100, '--bar-color': '#9B1C1C' }} /></div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              <div className="col-lg-6">
                <div className="cf-panel h-100" data-reveal>
                  <h2 className="cf-h3 mb-1">Resolution leaderboard</h2>
                  <p className="cf-small cf-muted mb-3">Share of each district's issues that are fixed.</p>
                  <div className="table-responsive">
                    <table className="table align-middle mb-0">
                      <thead><tr><th scope="col">#</th><th scope="col">District</th><th scope="col" className="text-end">Resolved</th><th scope="col" className="text-end">Rate</th></tr></thead>
                      <tbody>
                        {stats.leaderboard.map((d, i) => (
                          <tr key={`${d.district}-${d.state}`}>
                            <td>{i + 1}</td>
                            <td>{d.district}<span className="d-block cf-small cf-muted">{d.state}</span></td>
                            <td className="text-end">{d.resolved} / {d.total}</td>
                            <td className="text-end"><strong>{d.rate}%</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
