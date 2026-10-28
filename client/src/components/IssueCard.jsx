// IssueCard: one issue in a list (photo, category chip, title, place, time,
// status). Wrapped in React.memo so a list re-render only redraws the cards
// whose props actually changed.
//   compact   home-page version (as in the design: no counts)
//   onUpvote  shows the heart ("Me too") button on the photo

import { memo } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import useT from '../hooks/useT.js';
import { STATUS_CLASS, categoryInfo, daysIgnored, daysToFix, isEscalated, priorityScore, timeAgo } from '../utils/issueMath.js';

// Shown when the reporter did not add a photo.
export const FALLBACK_IMAGE = '/images/07-pale-city-map-texture.png';

function IssueCard({ issue, compact = false, onUpvote, upvoted = false }) {
  const t = useT();
  const category = categoryInfo(issue.category);
  const photo = (issue.imageUrls && issue.imageUrls[0]) || FALLBACK_IMAGE;
  const place = [issue.location.city, issue.location.district].filter(Boolean).join(', ');
  const days = daysIgnored(issue);
  const fixedIn = daysToFix(issue);
  const people = issue.reportCount || 1;

  return (
    <article className="cf-card cf-card--hover h-100 d-flex flex-column">
      <div className="cf-card__media">
        <img src={photo} alt={issue.imageUrls && issue.imageUrls.length ? `Photo of the reported issue: ${issue.title}` : ''} loading="lazy" />
        {onUpvote && (
          <button
            type="button"
            className={`cf-card__fav${upvoted ? ' is-on' : ''}`}
            onClick={() => onUpvote(issue)}
            aria-pressed={upvoted}
            aria-label={`Me too: upvote ${issue.title} (${issue.upvotes} so far)`}
          >
            <span aria-hidden="true">{upvoted ? '♥' : '♡'}</span>
          </button>
        )}
      </div>

      <div className="cf-card__body d-flex flex-column flex-grow-1">
        <div>
          <span className={`cf-chip cf-chip--${category.tone}`}>{category.chip}</span>
        </div>
        <h3 className="cf-card__title">
          {/* The whole card is clickable through this link (.stretched-link). */}
          <Link to={`/issues/${issue.complaintId}`} className="stretched-link text-reset text-decoration-none">
            {issue.title}
          </Link>
        </h3>
        <ul className="cf-meta">
          <li><Icon name="pin" className="cf-pin" size={14} /> {place}</li>
          <li>
            <Icon name="clock" size={14} />{' '}
            {compact || fixedIn === null && days < 1
              ? timeAgo(issue.createdAt)
              : fixedIn !== null ? t('common.fixedIn', { n: fixedIn }) : `${days} ${t(days === 1 ? 'common.dayIgnored' : 'common.daysIgnored')}`}
          </li>
          {!compact && (
            <li>
              <Icon name="people" size={14} /> {t('common.reportedBy', { n: people })} · {t('common.priority')} {priorityScore(issue)}
            </li>
          )}
        </ul>
        <div className="mt-auto d-flex flex-wrap gap-2">
          <span className={`cf-chip cf-status ${STATUS_CLASS[issue.status] || ''}`}>{issue.status}</span>
          {isEscalated(issue) && <span className="cf-chip cf-status cf-escalated">Escalated</span>}
          {issue.reopenCount > 0 && issue.status !== 'Resolved' && <span className="cf-chip cf-status cf-status--reopened">Reopened</span>}
        </div>
      </div>
    </article>
  );
}

export default memo(IssueCard);
