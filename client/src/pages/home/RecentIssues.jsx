// RecentIssues: "Recent Issues in Your City" with three issue cards.

import { Link } from 'react-router-dom';
import IssueCard from '../../components/IssueCard.jsx';
import useT from '../../hooks/useT.js';

export default function RecentIssues({ issues }) {
  const t = useT();

  return (
    <section className="lp-block container-xl" aria-labelledby="recent-title">
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-3">
        <h2 id="recent-title" className="lp-block__title m-0" data-reveal>{t('recent.title')}</h2>
        <Link className="cf-link-arrow" to="/issues" data-reveal>{t('recent.viewAll')} <span aria-hidden="true">→</span></Link>
      </div>

      <div className="row g-3" data-stagger>
        {issues.map((issue) => (
          <div className="col-md-6 col-xl-4" key={issue.complaintId} data-reveal>
            <IssueCard issue={issue} compact />
          </div>
        ))}
      </div>
    </section>
  );
}
