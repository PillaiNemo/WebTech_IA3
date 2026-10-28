// Track.jsx: routes "/track" and "/track/:complaintId".
// Enter a complaint ID to see its status timeline. A merged complaint
// shows which issue it was merged into, with a link.

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import StatusTimeline from '../components/StatusTimeline.jsx';
import { osmLink } from '../components/MapEmbed.jsx';
import { FALLBACK_IMAGE } from '../components/IssueCard.jsx';
import { PageHeader } from '../components/States.jsx';
import useT from '../hooks/useT.js';
import { getJSON } from '../services/api.js';
import { categoryInfo } from '../utils/issueMath.js';

const ID_PATTERN = /^CF-\d{4}-\d{5}$/;
const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Track() {
  const t = useT();
  const { complaintId } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(complaintId || '');
  const [issue, setIssue] = useState(null);
  const [state, setState] = useState(complaintId ? 'loading' : 'idle'); // idle | loading | done | error
  const [error, setError] = useState('');

  // Load whenever the ID in the address changes.
  useEffect(() => {
    if (!complaintId) return;
    let cancelled = false;
    setState('loading');
    getJSON(`/api/track/${encodeURIComponent(complaintId)}`)
      .then((data) => { if (!cancelled) { setIssue(data); setState('done'); } })
      .catch((err) => { if (!cancelled) { setError(err.message); setState('error'); } });
    return () => { cancelled = true; };
  }, [complaintId]);

  function submit(e) {
    e.preventDefault();
    const id = input.trim().toUpperCase();
    if (!ID_PATTERN.test(id)) {
      setError('Complaint IDs look like CF-2026-00123.');
      setState('error');
      return;
    }
    navigate(`/track/${id}`);
  }

  return (
    <section className="cf-section pt-4">
      <div className="container-xl">
        <PageHeader title={t('track.title')} text={t('track.sub')} />

        <form className="cf-track-form" onSubmit={submit} noValidate>
          <label className="visually-hidden" htmlFor="track-id">Complaint ID</label>
          <input
            id="track-id"
            className={`form-control form-control-lg${state === 'error' ? ' is-invalid' : ''}`}
            placeholder="CF-2026-00012"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
            aria-describedby="track-error"
          />
          <button className="btn btn-primary btn-lg" type="submit">{t('track.button')}</button>
        </form>
        {state === 'error' && <p id="track-error" className="text-danger mt-2" role="alert">{error}</p>}

        {state === 'loading' && <div className="cf-skel mt-4" style={{ height: 320 }} aria-label={t('common.loading')} />}

        {state === 'done' && issue && (
          <div className="mt-4">
            {issue.status === 'Merged' && issue.mergedInto && (
              <div className="cf-notice mb-4" role="status">
                This was merged into <Link to={`/track/${issue.mergedInto}`}>{issue.mergedInto}</Link> because several people reported the same problem.
                {' '}That issue is currently <strong>{issue.masterStatus}</strong>.
              </div>
            )}
            <div className="row g-4">
              <div className="col-lg-8">
                <div className="cf-panel h-100">
                  <div className="d-flex justify-content-between flex-wrap gap-2 mb-3">
                    <h2 className="cf-h3 m-0">{issue.title}</h2>
                    <span className="cf-mono cf-muted">{issue.complaintId}</span>
                  </div>
                  <StatusTimeline issue={issue} />
                </div>
              </div>
              <div className="col-lg-4">
                <aside className="cf-panel h-100">
                  <img className="cf-track-photo" src={issue.imageUrls[0] || FALLBACK_IMAGE} alt={issue.imageUrls[0] ? `Photo of ${issue.title}` : ''} />
                  <dl className="cf-track-facts">
                    <dt>Category</dt><dd>{categoryInfo(issue.category).label}</dd>
                    <dt>Location</dt><dd>{issue.location.city}, {issue.location.district}</dd>
                    <dt>Reported on</dt><dd>{formatDate(issue.createdAt)}</dd>
                    <dt>Last updated</dt><dd>{formatDate(issue.updatedAt)}</dd>
                  </dl>
                  <div className="d-grid gap-2">
                    {Number.isFinite(issue.location.lat) && (
                      <a className="btn btn-ghost" href={osmLink(issue.location.lat, issue.location.lng)} target="_blank" rel="noreferrer">
                        <Icon name="map" size={16} /> View on Map
                      </a>
                    )}
                    {issue.status !== 'Merged' && <Link className="btn btn-outline-primary" to={`/issues/${issue.complaintId}`}>Open issue page</Link>}
                  </div>
                </aside>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
