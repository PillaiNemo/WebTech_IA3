// Step 4: "Review Your Complaint" before it is submitted.

import Icon from '../../components/Icon.jsx';
import { FALLBACK_IMAGE } from '../../components/IssueCard.jsx';
import { categoryInfo } from '../../utils/issueMath.js';

export default function ReviewStep({ form }) {
  const { location } = form;

  return (
    <div>
      <h2 className="cf-h4 mb-3">Review Your Complaint</h2>
      <div className="row g-4">
        <div className="col-md-5">
          <img className="cf-review__photo" src={form.image || FALLBACK_IMAGE} alt={form.image ? 'The photo you are attaching' : 'No photo attached'} />
        </div>
        <div className="col-md-7">
          <dl className="cf-review">
            <dt>Category</dt><dd>{categoryInfo(form.category).label}</dd>
            <dt>Title</dt><dd>{form.title}</dd>
            <dt>Description</dt><dd>{form.description}</dd>
            <dt>Severity</dt><dd>{form.severity}</dd>
            <dt>Location</dt>
            <dd className="d-flex gap-2">
              <Icon name="pin" className="cf-pin mt-1" size={16} />
              <span>{location.city}, {location.district}, {location.state}{location.landmark && <><br />{location.landmark}</>}</span>
            </dd>
            <dt>Reported by</dt><dd>{form.anonymous ? 'Anonymous' : form.name || 'Name not given'}</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}
