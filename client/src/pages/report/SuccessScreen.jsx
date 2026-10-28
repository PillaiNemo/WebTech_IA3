// The success screen: an animated green tick, the complaint reference ID
// with a Copy button, a short summary and two ways forward.
// `supported` = the person added their support to an existing issue.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import CivicUI from '../../lib/civicui.js';
import { STATUS_CLASS, categoryInfo } from '../../utils/issueMath.js';

// Decorative dots around the tick (position, colour, delay).
const DOTS = [
  [8, 22, '#F5CF8C', 0], [16, 60, '#A9CCE6', 0.2], [24, 12, '#F4B497', 0.4], [32, 78, '#9FD7A4', 0.1],
  [68, 18, '#A9CCE6', 0.3], [76, 70, '#F5CF8C', 0.5], [84, 30, '#F4B497', 0.2], [92, 56, '#9FD7A4', 0.4]
];

export default function SuccessScreen({ issue, supported }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    CivicUI.copyText(issue.complaintId).then(() => {
      setCopied(true);
      CivicUI.announce(`Copied ${issue.complaintId}`);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => CivicUI.announce('Could not copy. Please select the ID and copy it.'));
  }

  return (
    <div className="cf-success">
      <img className="cf-success__art cf-success__art--left" src="/images/08-botanical-branch-sketch.png" alt="" />
      <img className="cf-success__art cf-success__art--right" src="/images/03-architectural-line-art.png" alt="" />
      {DOTS.map(([left, top, color, delay]) => (
        <span key={`${left}-${top}`} className="cf-success__dot" style={{ left: `${left}%`, top: `${top}%`, background: color, animationDelay: `${delay}s` }} aria-hidden="true" />
      ))}

      <div className="cf-success__inner">
        <svg className="cf-check" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="30" />
          <path d="M19 33l9 9 17-19" />
        </svg>
        <h1 className="cf-h2 mt-3 mb-1">{supported ? 'Thank you for your support!' : 'Complaint Submitted Successfully!'}</h1>
        <p className="cf-muted mb-4">
          {supported
            ? `Your report was added to an existing complaint, which is now reported by ${issue.reportCount} people.`
            : 'Thank you for reporting. Your complaint has been recorded.'}
        </p>

        <div className="cf-success__ref">
          <div>
            <p className="cf-label mb-1">Complaint Reference ID</p>
            <p className="cf-success__id m-0">{issue.complaintId}</p>
          </div>
          <button type="button" className={`btn btn-ghost cf-copy${copied ? ' is-copied' : ''}`} onClick={copy}>
            <span className="cf-copy__idle"><Icon name="copy" size={16} /> Copy</span>
            <span className="cf-copy__done" aria-hidden="true"><Icon name="check" size={16} /> Copied</span>
          </button>
        </div>

        <dl className="cf-success__facts">
          <div><dt>Category</dt><dd>{categoryInfo(issue.category).label}</dd></div>
          <div><dt>Status</dt><dd><span className={`cf-chip cf-status ${STATUS_CLASS[issue.status] || ''}`}>{issue.status}</span></dd></div>
          <div><dt>Location</dt><dd>{issue.location.city}, {issue.location.district}{issue.location.landmark && <><br />{issue.location.landmark}</>}</dd></div>
        </dl>

        <div className="d-flex flex-wrap justify-content-center gap-3 mt-4">
          <Link className="btn btn-primary btn-lg" to={`/track/${issue.complaintId}`}>Track Complaint</Link>
          <Link className="btn btn-outline-primary btn-lg" to="/">Return to Home</Link>
        </div>
      </div>
    </div>
  );
}
