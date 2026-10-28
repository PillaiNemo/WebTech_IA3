// Step 2.5: "Similar issues near you". Shown only when the duplicate check
// finds matches. The person either adds their support to one of them or
// says theirs is different.

import { FALLBACK_IMAGE } from '../../components/IssueCard.jsx';
import { STATUS_CLASS, daysIgnored } from '../../utils/issueMath.js';

export default function SimilarStep({ matches, onSupport, onDifferent, busyId }) {
  return (
    <div>
      <h2 className="cf-h4 mb-1">Similar issues near you</h2>
      <p className="cf-muted mb-4">
        {matches.length === 1 ? 'Someone has' : `${matches.length} reports have`} already been made for this kind of problem here.
        If one of them is yours, add your support: one strong report gets fixed faster than many small ones.
      </p>

      <div className="row g-3">
        {matches.map((m) => (
          <div className="col-md-6" key={m.complaintId}>
            <article className="cf-card cf-similar h-100">
              <img src={m.imageUrls[0] || FALLBACK_IMAGE} alt="" />
              <div className="cf-similar__body">
                <span className={`cf-chip cf-status ${STATUS_CLASS[m.status] || ''}`}>{m.status}</span>
                <h3 className="cf-card__title mb-1">{m.title}</h3>
                <p className="cf-small cf-muted mb-2">
                  {m.distance !== null ? `${m.distance} m away · ` : ''}{daysIgnored(m)} {daysIgnored(m) === 1 ? 'day' : 'days'} ignored · reported by {m.reportCount} {m.reportCount === 1 ? 'person' : 'people'}
                </p>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => onSupport(m)} disabled={!!busyId}>
                  {busyId === m.complaintId ? 'Adding…' : 'This is the same issue, add my support'}
                </button>
              </div>
            </article>
          </div>
        ))}
      </div>

      <div className="cf-notice mt-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
        <span>None of these is your problem?</span>
        <button type="button" className="btn btn-outline-primary" onClick={onDifferent} disabled={!!busyId}>Mine is different, continue</button>
      </div>
    </div>
  );
}
