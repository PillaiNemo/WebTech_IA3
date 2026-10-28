// Step 2: title, description, photo, severity, and who is reporting.

import PhotoPicker from '../../components/PhotoPicker.jsx';
import { MIN_DESCRIPTION } from '../../utils/reportValidation.js';

const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

export default function DetailsStep({ form, set, errors }) {
  const invalid = (name) => (errors[name] ? ' is-invalid' : '');

  return (
    <div>
      <h2 className="cf-h4 mb-3">Issue Details</h2>

      <div className="mb-3">
        <label className="form-label" htmlFor="r-title">Title *</label>
        <input id="r-title" name="title" className={`form-control${invalid('title')}`} maxLength={120}
          placeholder="Large pothole near bus stop" value={form.title} onChange={(e) => set({ title: e.target.value })}
          aria-invalid={!!errors.title} aria-describedby="r-title-error" />
        <div className="invalid-feedback" id="r-title-error">{errors.title}</div>
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="r-desc">Description *</label>
        <textarea id="r-desc" name="description" className={`form-control${invalid('description')}`} rows="4" maxLength={2000}
          placeholder="There is a large pothole on the main road near the bus stop. It is very dangerous for two-wheelers and cars, especially at night."
          value={form.description} onChange={(e) => set({ description: e.target.value })}
          aria-invalid={!!errors.description} aria-describedby="r-desc-hint r-desc-error" />
        <div className="invalid-feedback" id="r-desc-error">{errors.description}</div>
        <div className="cf-hint" id="r-desc-hint"><span>At least {MIN_DESCRIPTION} characters</span><span>{form.description.trim().length} / {MIN_DESCRIPTION}</span></div>
      </div>

      <div className="mb-4">
        <PhotoPicker value={form.image} onChange={(image) => set({ image })} />
      </div>

      <div className="row g-3 align-items-end mb-3">
        <div className="col-md-7">
          <p className="form-label mb-2" id="r-sev">Severity</p>
          <div className="cf-seg" role="radiogroup" aria-labelledby="r-sev">
            {SEVERITIES.map((s) => (
              <span key={s}>
                <input type="radio" name="severity" id={`sev-${s}`} value={s} checked={form.severity === s} onChange={() => set({ severity: s })} />
                <label htmlFor={`sev-${s}`} data-sev={s}>{s}</label>
              </span>
            ))}
          </div>
        </div>
        <div className="col-md-5">
          <div className="form-check form-switch">
            <input className="form-check-input" type="checkbox" role="switch" id="r-anon" checked={form.anonymous} onChange={(e) => set({ anonymous: e.target.checked })} />
            <label className="form-check-label" htmlFor="r-anon">Report anonymously</label>
          </div>
        </div>
      </div>

      {!form.anonymous && (
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label" htmlFor="r-name">Your name (optional)</label>
            <input id="r-name" className="form-control" maxLength={60} autoComplete="name" value={form.name} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="r-phone">Phone (optional, only officials see it)</label>
            <input id="r-phone" className={`form-control${invalid('phone')}`} inputMode="numeric" maxLength={10} autoComplete="tel-national"
              placeholder="98765 43210" value={form.phone} onChange={(e) => set({ phone: e.target.value.replace(/\D/g, '') })}
              aria-invalid={!!errors.phone} aria-describedby="r-phone-error" />
            <div className="invalid-feedback" id="r-phone-error">{errors.phone}</div>
          </div>
        </div>
      )}

      {/* Honeypot: hidden from people, tempting for bots */}
      <div className="cf-hp" aria-hidden="true">
        <label htmlFor="r-website">Leave this field empty</label>
        <input id="r-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set({ website: e.target.value })} />
      </div>
    </div>
  );
}
