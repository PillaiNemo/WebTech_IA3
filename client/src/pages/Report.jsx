// Report.jsx: route "/report". The report flow:
//   1 Category -> 2 Details -> 3 Location -> (Similar issues) -> 4 Review -> Success
// "Similar issues near you" only appears when the duplicate check
// (GET /api/issues/nearby) finds open issues of the same kind nearby.

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import LocationPicker from '../components/LocationPicker.jsx';
import CivicUI from '../lib/civicui.js';
import useT from '../hooks/useT.js';
import locations from '../data/locations.json';
import { getJSON, postJSON } from '../services/api.js';
import { getVoterToken } from '../utils/voter.js';
import { toast } from '../utils/toast.js';
import { validateCategory, validateDetails, validateLocation } from '../utils/reportValidation.js';
import CategoryStep from './report/CategoryStep.jsx';
import DetailsStep from './report/DetailsStep.jsx';
import SimilarStep from './report/SimilarStep.jsx';
import ReviewStep from './report/ReviewStep.jsx';
import SuccessScreen from './report/SuccessScreen.jsx';

const EMPTY_FORM = {
  category: '',
  title: '',
  description: '',
  severity: 'Medium',
  image: '',
  anonymous: true,
  name: '',
  phone: '',
  website: '', // honeypot
  location: { state: '', district: '', city: '', landmark: '', lat: undefined, lng: undefined }
};

// The four steps on the indicator (the similar-issues step sits between 3 and 4).
const STEP_KEYS = ['category', 'details', 'location', 'review'];

// Area centre from locations.json, used when the person did not share GPS.
function areaCentre({ state, district, city }) {
  const s = locations.states.find((x) => x.name === state);
  const d = s && s.districts.find((x) => x.name === district);
  const c = d && d.cities.find((x) => x.name === city);
  return c ? { lat: c.lat, lng: c.lng } : {};
}

export default function Report() {
  const t = useT();
  const [step, setStep] = useState('category'); // category | details | location | similar | review | done
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [matches, setMatches] = useState([]);
  const [notDuplicate, setNotDuplicate] = useState(false);
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState(null); // { issue, supported }
  const panelRef = useRef(null);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const hasGps = Number.isFinite(form.location.lat) && Number.isFinite(form.location.lng);

  // Once errors are showing, re-check as the person types so each message
  // disappears the moment its field becomes valid.
  const hasErrors = Object.keys(errors).length > 0;
  useEffect(() => {
    if (!hasErrors) return;
    const validators = { category: validateCategory, details: validateDetails, location: validateLocation };
    if (validators[step]) setErrors(validators[step](form));
  }, [form, step, hasErrors]);

  function go(next) {
    setErrors({});
    setStep(next);
    window.scrollTo({ top: 0, behavior: CivicUI.prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  // Shows the errors and shakes the first invalid field.
  function fail(found) {
    setErrors(found);
    requestAnimationFrame(() => {
      const field = panelRef.current && panelRef.current.querySelector('.is-invalid, [role="alert"]');
      if (field) {
        CivicUI.shake(field);
        if (field.focus) field.focus();
      }
    });
  }

  // Runs the duplicate check; shows the similar step only when there are matches.
  async function checkNearby() {
    setBusy('nearby');
    const { state, district, city, landmark, lat, lng } = form.location;
    const query = new URLSearchParams({ category: form.category, state, district, city, text: `${form.title} ${landmark}` });
    if (hasGps) { query.set('lat', lat); query.set('lng', lng); }
    try {
      const data = await getJSON(`/api/issues/nearby?${query}`);
      setMatches(data.matches);
      go(data.matches.length ? 'similar' : 'review');
    } catch {
      // If the check fails we continue; the server checks again on submit.
      go('review');
    } finally {
      setBusy('');
    }
  }

  function next() {
    if (step === 'category') {
      const found = validateCategory(form);
      return Object.keys(found).length ? fail(found) : go('details');
    }
    if (step === 'details') {
      const found = validateDetails(form);
      return Object.keys(found).length ? fail(found) : go('location');
    }
    if (step === 'location') {
      const found = validateLocation(form);
      return Object.keys(found).length ? fail(found) : checkNearby();
    }
    return undefined;
  }

  function back() {
    const order = ['category', 'details', 'location', ...(matches.length ? ['similar'] : []), 'review'];
    go(order[Math.max(0, order.indexOf(step) - 1)]);
  }

  async function submit() {
    setBusy('submit');
    const loc = hasGps ? { ...form.location, approximate: false } : { ...form.location, ...areaCentre(form.location), approximate: true };
    try {
      const issue = await postJSON('/api/issues', {
        title: form.title,
        description: form.description,
        category: form.category,
        severity: form.severity,
        image: form.image || undefined,
        location: loc,
        reporter: { anonymous: form.anonymous, name: form.name, phone: form.phone },
        website: form.website,
        confirmedNotDuplicate: notDuplicate,
        voterToken: getVoterToken()
      });
      setResult({ issue, supported: false });
      go('done');
    } catch (err) {
      if (err.status === 409) {
        // The server found a duplicate the first check missed.
        setMatches(err.data.matches);
        toast('info', 'Similar issues found', err.message);
        go('similar');
      } else {
        toast('error', err.status === 429 ? 'Please slow down' : 'Could not submit', err.message);
      }
    } finally {
      setBusy('');
    }
  }

  // "This is the same issue, add my support"
  async function support(match) {
    setBusy(match.complaintId);
    try {
      const issue = await postJSON(`/api/issues/${match.complaintId}/support`, {
        note: form.description,
        image: form.image || undefined,
        voterToken: getVoterToken()
      });
      setResult({ issue, supported: true });
      go('done');
    } catch (err) {
      toast(err.status === 409 ? 'info' : 'error', err.status === 409 ? 'Already supported' : 'Could not add support', err.message);
    } finally {
      setBusy('');
    }
  }

  if (step === 'done' && result) {
    return (
      <section className="cf-section pt-4">
        <div className="container-xl"><SuccessScreen issue={result.issue} supported={result.supported} /></div>
      </section>
    );
  }

  const indicatorIndex = step === 'similar' ? 2 : STEP_KEYS.indexOf(step);

  return (
    <section className="cf-section pt-4">
      <div className="container-xl">
        <Link className="cf-back" to="/"><span><Icon name="back" size={14} /></span> {t('common.backHome')}</Link>
        <h1 className="cf-h1 mt-2 mb-1">{t('report.title')}</h1>
        <p className="cf-muted mb-4">{t('report.sub')}</p>

        <ol className="cf-steps mb-5" aria-label="Report progress">
          {STEP_KEYS.map((key, i) => (
            <li key={key} className={i < indicatorIndex ? 'is-done' : i === indicatorIndex ? 'is-current' : ''} aria-current={i === indicatorIndex ? 'step' : undefined}>
              <span className="cf-steps__dot">{i + 1}</span>{t(`report.step.${key}`)}
            </li>
          ))}
        </ol>

        <div className="cf-panel" ref={panelRef} aria-live="polite">
          {step === 'category' && <CategoryStep value={form.category} onChange={(category) => set({ category })} error={errors.category} />}
          {step === 'details' && <DetailsStep form={form} set={set} errors={errors} />}
          {step === 'location' && (
            <div>
              <h2 className="cf-h4 mb-1">Select Location</h2>
              <p className="cf-muted cf-small mb-4">Choose the area from the lists, or share your current location for the exact spot.</p>
              <LocationPicker value={form.location} onChange={(location) => set({ location })} errors={errors} />
            </div>
          )}
          {step === 'similar' && (
            <SimilarStep
              matches={matches}
              busyId={busy && busy !== 'submit' ? busy : ''}
              onSupport={support}
              onDifferent={() => { setNotDuplicate(true); go('review'); }}
            />
          )}
          {step === 'review' && <ReviewStep form={form} />}

          <div className="d-flex justify-content-between gap-3 mt-5">
            {step !== 'category' ? (
              <button type="button" className="btn btn-ghost" onClick={back}><span aria-hidden="true">←</span> {t('common.back')}</button>
            ) : <span />}
            {['category', 'details', 'location'].includes(step) && (
              <button type="button" className="btn btn-primary" onClick={next} disabled={busy === 'nearby'}>
                {busy === 'nearby' ? 'Checking nearby…' : t('common.next')} <span className="cf-arrow" aria-hidden="true">→</span>
              </button>
            )}
            {step === 'review' && (
              <button type="button" className="btn btn-primary btn-lg" onClick={submit} disabled={busy === 'submit'}>
                {busy === 'submit' ? 'Submitting…' : 'Submit Complaint'}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
