// Admin.jsx: route "/admin".
// Log in with the passcode (checked on the server), then a dashboard:
//   - overview numbers (open, awaiting response, escalated, flagged, resolved)
//   - "Needs attention": the highest-priority open issues and why
//   - the status pipeline and possible duplicates (same category and area)
//   - every complaint in a searchable, sortable table with an update panel,
//     the Flagged queue, and the side-by-side merge tool.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import { FALLBACK_IMAGE } from '../components/IssueCard.jsx';
import { ErrorState } from '../components/States.jsx';
import { deleteJSON, getJSON, patchJSON, postJSON } from '../services/api.js';
import { toast } from '../utils/toast.js';
import { STATUS_CLASS, categoryInfo, daysBetween, daysIgnored, isEscalated, priorityScore } from '../utils/issueMath.js';

const TOKEN_KEY = 'cf-admin-token';
const TABS = ['All', 'Reported', 'Acknowledged', 'In Progress', 'Resolved', 'Merged', 'Flagged', 'Merge duplicates'];
const OPEN = ['Reported', 'Acknowledged', 'In Progress'];
const PIPELINE = ['Reported', 'Acknowledged', 'In Progress', 'Resolved'];
const PAGE_SIZE = 15;
const SEVERITY_CLASS = { Low: 'cf-chip--other', Medium: 'cf-chip--light', High: 'cf-chip--roads', Critical: 'cf-escalated' };

// Ready-made official notes, so an update takes one click.
const NOTE_TEMPLATES = [
  { status: 'Acknowledged', text: 'Complaint received and assigned to the ward team. An inspection is scheduled.' },
  { status: 'In Progress', text: 'Work has started on site.' },
  { status: 'Resolved', text: 'The problem has been fixed. If it is not, press "Still not fixed" on this page.' }
];

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function readToken() {
  try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}

// The date of the most recent status change (or the report itself).
function lastUpdate(issue) {
  const history = issue.statusHistory || [];
  return history.length ? history[history.length - 1].date : issue.createdAt;
}

// Why an open issue needs attention, most serious first.
function reasons(issue) {
  const out = [];
  const days = daysIgnored(issue);
  const quiet = daysBetween(lastUpdate(issue));
  if (isEscalated(issue)) out.push({ text: `Escalated · ${days} days open`, tone: 'cf-escalated' });
  if (issue.severity === 'Critical') out.push({ text: 'Critical severity', tone: 'cf-escalated' });
  if (issue.status === 'Reported' && days >= 3) out.push({ text: `No response for ${days} days`, tone: 'cf-status--reported' });
  else if (quiet >= 7) out.push({ text: `No update for ${quiet} days`, tone: 'cf-status--acknowledged' });
  if (issue.reportCount >= 3) out.push({ text: `${issue.reportCount} people reported it`, tone: 'cf-status--progress' });
  if (issue.reopenCount > 0) out.push({ text: 'Reopened by residents', tone: 'cf-status--acknowledged' });
  return out;
}

// ---------- Login -------------------------------------------------------------
function AdminLogin({ onLogin }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!passcode) { setError('Enter the admin passcode.'); return; }
    setBusy(true);
    try {
      const { token } = await postJSON('/api/admin/login', { passcode });
      onLogin(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cf-panel mx-auto" style={{ maxWidth: 440 }}>
      <span className="cf-tile__icon mb-3"><Icon name="shield" size={22} /></span>
      <h1 className="cf-h2 mb-1">Admin login</h1>
      <p className="cf-muted mb-4">For municipal staff. The passcode is checked on the server.</p>
      <form onSubmit={submit} noValidate>
        <label className="form-label" htmlFor="a-pass">Passcode</label>
        <input id="a-pass" type="password" className={`form-control mb-2${error ? ' is-invalid' : ''}`} autoComplete="current-password"
          value={passcode} onChange={(e) => { setPasscode(e.target.value); setError(''); }} aria-describedby="a-pass-error" />
        <div className="invalid-feedback mb-2" id="a-pass-error">{error}</div>
        <button className="btn btn-primary w-100 mt-2" type="submit" disabled={busy}>{busy ? 'Checking…' : 'Log in'}</button>
      </form>
    </div>
  );
}

// ---------- Side-by-side card used by the merge tool --------------------------
function CompareCard({ issue, label }) {
  if (!issue) return <div className="cf-empty h-100"><p className="cf-muted m-0">Choose the {label.toLowerCase()} issue above.</p></div>;
  return (
    <article className="cf-card h-100">
      <div className="cf-card__media"><img src={issue.imageUrls[0] || FALLBACK_IMAGE} alt="" /></div>
      <div className="cf-card__body">
        <p className="cf-label mb-1">{label} · {issue.complaintId}</p>
        <h3 className="cf-card__title mt-0">{issue.title}</h3>
        <p className="cf-small cf-muted mb-2">{issue.description}</p>
        <ul className="cf-meta">
          <li>{issue.location.city}, {issue.location.district} {issue.location.landmark && `· ${issue.location.landmark}`}</li>
          <li>{issue.status} · {daysIgnored(issue)} days ignored · reported by {issue.reportCount} · {issue.upvotes} upvotes</li>
        </ul>
      </div>
    </article>
  );
}

// ---------- One overview number -------------------------------------------------
function Kpi({ icon, label, value, note, tone = '', onClick }) {
  return (
    <button type="button" className={`ad-kpi${tone ? ` ad-kpi--${tone}` : ''}`} onClick={onClick}>
      <span className="ad-kpi__head"><Icon name={icon} size={16} /> {label}</span>
      <span className="ad-kpi__value">{value}</span>
      <span className="ad-kpi__note">{note}</span>
    </button>
  );
}

// ---------- The panel -----------------------------------------------------------
export default function Admin() {
  const [token, setToken] = useState(readToken);
  const [tab, setTab] = useState('All');
  const [issues, setIssues] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [newStatus, setNewStatus] = useState('In Progress');
  const [note, setNote] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [merge, setMerge] = useState({ dup: '', master: '' });
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [show, setShow] = useState('all');        // all | escalated | quiet
  const [sort, setSort] = useState('priority');   // priority | oldest | newest
  const [limit, setLimit] = useState(PAGE_SIZE);  // rows shown before "Show all"
  const listRef = useRef(null);
  const updateRef = useRef(null);

  const logout = useCallback(() => {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
    setToken('');
  }, []);

  const login = (next) => {
    try { sessionStorage.setItem(TOKEN_KEY, next); } catch { /* ignore */ }
    setToken(next);
    toast('success', 'Welcome back', 'You are logged in as admin.');
  };

  // Loads everything once; each change reloads so the numbers stay honest.
  const load = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      const [all, flags] = await Promise.all([
        getJSON('/api/admin/issues', { token }),
        getJSON('/api/admin/flagged', { token })
      ]);
      setIssues(all.items);
      setFlagged(flags.items);
      setLoaded(true);
    } catch (err) {
      if (err.status === 401) { logout(); toast('info', 'Please log in again', err.message); }
      else setError(err.message);
    }
  }, [token, logout]);

  useEffect(() => { load(); }, [load]);

  const selected = issues.find((i) => i.complaintId === selectedId);
  const openIssues = useMemo(() => issues.filter((i) => OPEN.includes(i.status)), [issues]);
  const counts = useMemo(() => {
    const c = { All: issues.filter((i) => i.status !== 'Merged').length, Flagged: flagged.length };
    issues.forEach((i) => { c[i.status] = (c[i.status] || 0) + 1; });
    return c;
  }, [issues, flagged]);

  // ---- Overview numbers ----
  const overview = useMemo(() => {
    const live = openIssues.filter((i) => !i.isHidden);
    const waiting = live.filter((i) => i.status === 'Reported');
    const resolved30 = issues.filter((i) => i.status === 'Resolved' && i.resolvedAt && daysBetween(i.resolvedAt) <= 30);
    const fixDays = resolved30.map((i) => daysBetween(i.createdAt, i.resolvedAt));
    return {
      open: live.length,
      newThisWeek: live.filter((i) => daysBetween(i.createdAt) <= 7).length,
      waiting: waiting.length,
      oldestWaiting: waiting.reduce((max, i) => Math.max(max, daysIgnored(i)), 0),
      escalated: live.filter(isEscalated).length,
      flagged: flagged.length,
      hidden: flagged.filter((i) => i.isHidden).length,
      resolved30: resolved30.length,
      avgFix: fixDays.length ? (fixDays.reduce((a, b) => a + b, 0) / fixDays.length).toFixed(1) : '–'
    };
  }, [issues, openIssues, flagged]);

  // ---- Needs attention: the six highest-priority open issues ----
  const attention = useMemo(
    () => openIssues.filter((i) => !i.isHidden).sort((a, b) => priorityScore(b) - priorityScore(a)).slice(0, 6),
    [openIssues]
  );

  // ---- Possible duplicates: open issues with the same category in the same area ----
  const duplicateGroups = useMemo(() => {
    const groups = {};
    openIssues.filter((i) => !i.isHidden).forEach((i) => {
      const key = `${i.category}|${(i.location.city || '').toLowerCase()}|${(i.location.district || '').toLowerCase()}`;
      (groups[key] = groups[key] || []).push(i);
    });
    return Object.values(groups)
      .filter((g) => g.length > 1)
      .map((g) => g.sort((a, b) => (b.reportCount - a.reportCount) || (new Date(a.createdAt) - new Date(b.createdAt))))
      .sort((a, b) => b.length - a.length);
  }, [openIssues]);

  // ---- The table: tab + search + quick filter + sort ----
  const visible = useMemo(() => {
    let list = tab === 'All' ? issues.filter((i) => i.status !== 'Merged') : issues.filter((i) => i.status === tab);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((i) => [i.complaintId, i.title, i.location.city, i.location.district, i.location.landmark]
        .some((v) => (v || '').toLowerCase().includes(q)));
    }
    if (show === 'escalated') list = list.filter(isEscalated);
    if (show === 'quiet') list = list.filter((i) => OPEN.includes(i.status) && daysBetween(lastUpdate(i)) >= 7);
    const sorted = [...list];
    if (sort === 'priority') sorted.sort((a, b) => priorityScore(b) - priorityScore(a));
    if (sort === 'oldest') sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    if (sort === 'newest') sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return sorted;
  }, [issues, tab, query, show, sort]);

  // A new list starts again at the first 15 rows.
  useEffect(() => { setLimit(PAGE_SIZE); }, [tab, query, show, sort]);

  // Every admin action: call, toast, reload.
  async function run(action, successTitle, successText) {
    setBusy(true);
    try {
      await action();
      toast('success', successTitle, successText);
      await load();
      return true;
    } catch (err) {
      if (err.status === 401) logout();
      toast('error', 'That did not work', err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  // Choose an issue to update: opens the panel above the table and scrolls to it.
  function pickForUpdate(issue) {
    if (['Flagged', 'Merge duplicates', 'Merged'].includes(tab)) setTab('All');
    setSelectedId(issue.complaintId);
    setNewStatus(issue.status === 'Reported' ? 'Acknowledged' : issue.status);
    setNote('');
    requestAnimationFrame(() => {
      if (updateRef.current) {
        updateRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        updateRef.current.querySelector('select')?.focus({ preventScroll: true });
      }
    });
  }

  // Overview tiles and duplicate groups jump to the right list.
  function showList(nextTab, nextShow = 'all') {
    setTab(nextTab);
    setShow(nextShow);
    setQuery('');
    requestAnimationFrame(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  function reviewGroup(group) {
    setMerge({ dup: group[1].complaintId, master: group[0].complaintId });
    showList('Merge duplicates');
  }

  const saveStatus = async () => {
    const ok = await run(() => patchJSON(`/api/admin/issues/${selectedId}/status`, { status: newStatus, note }, { token }), 'Status updated', `${selectedId} is now ${newStatus}.`);
    if (ok) setNote('');
  };
  const confirmDelete = async () => {
    const id = toDelete.complaintId;
    setToDelete(null);
    await run(() => deleteJSON(`/api/admin/issues/${id}`, { token }), 'Deleted', `${id} was removed.`);
    if (selectedId === id) setSelectedId('');
  };
  const restore = (id) => run(() => patchJSON(`/api/admin/issues/${id}/restore`, {}, { token }), 'Restored', `${id} is visible again.`);
  const doMerge = async () => {
    const ok = await run(() => patchJSON(`/api/admin/issues/${merge.dup}/merge`, { masterId: merge.master }, { token }), 'Merged', `${merge.dup} was merged into ${merge.master}.`);
    if (ok) setMerge({ dup: '', master: '' });
  };

  if (!token) {
    return <section className="cf-section pt-4"><div className="container-xl"><AdminLogin onLogin={login} /></div></section>;
  }

  const today = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const pipelineTotal = PIPELINE.reduce((sum, s) => sum + (counts[s] || 0), 0) || 1;
  const lastNote = selected && (selected.statusHistory || []).slice(-1)[0];

  return (
    <section className="cf-section pt-4">
      <div className="container-xl">
        <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
          <div>
            <nav aria-label="Breadcrumb">
              <ol className="cf-crumbs"><li><Link to="/">Home</Link></li><li aria-current="page">Admin</li></ol>
            </nav>
            <h1 className="cf-h1 mb-1">Admin dashboard</h1>
            <p className="cf-muted m-0">
              {today}.{' '}
              {loaded && (overview.open
                ? <>There {overview.open === 1 ? 'is' : 'are'} <strong style={{ color: 'var(--cf-text)' }}>{plural(overview.open, 'open complaint')}</strong>, {overview.escalated} escalated and {overview.waiting} still waiting for a first response.</>
                : 'Every complaint has been handled.')}
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>Log out</button>
        </div>

        {error && <ErrorState message={error} onRetry={load} />}

        {!error && (
          <>
            {/* ---- Overview ---- */}
            <div className="ad-kpis" aria-label="Overview">
              <Kpi icon="file" label="Open complaints" value={overview.open} note={`${overview.newThisWeek} new in the last 7 days`} onClick={() => showList('All')} />
              <Kpi icon="clock" label="Awaiting first response" value={overview.waiting} tone={overview.oldestWaiting >= 3 ? 'warn' : ''}
                note={overview.waiting ? `Oldest has waited ${plural(overview.oldestWaiting, 'day')}` : 'All acknowledged'} onClick={() => showList('Reported')} />
              <Kpi icon="flag" label="Escalated" value={overview.escalated} tone={overview.escalated ? 'alert' : ''} note="Open for more than 30 days" onClick={() => showList('All', 'escalated')} />
              <Kpi icon="shield" label="Flagged for review" value={overview.flagged} tone={overview.flagged ? 'warn' : ''}
                note={`${overview.hidden} hidden from the public`} onClick={() => showList('Flagged')} />
              <Kpi icon="check" label="Resolved (30 days)" value={overview.resolved30} tone="good" note={`Average ${overview.avgFix} days to fix`} onClick={() => showList('Resolved')} />
            </div>

            <div className="row g-4 mt-0">
              {/* ---- Needs attention ---- */}
              <div className="col-xl-8">
                <div className="cf-panel h-100">
                  <div className="d-flex flex-wrap justify-content-between align-items-baseline gap-2 mb-3">
                    <div>
                      <h2 className="cf-h3 mb-1">Needs attention</h2>
                      <p className="cf-small cf-muted m-0">Highest priority first: reports × 3 + upvotes + days open + severity.</p>
                    </div>
                    <button type="button" className="cf-link-arrow btn btn-link p-0" onClick={() => { setSort('priority'); showList('All'); }}>See all <span aria-hidden="true">→</span></button>
                  </div>
                  {!attention.length && <p className="cf-muted m-0">Nothing is waiting. Well done.</p>}
                  <ol className="ad-attn">
                    {attention.map((issue) => (
                      <li key={issue.complaintId} className="ad-attn__item">
                        <span className="ad-attn__score" title="Priority score">{priorityScore(issue)}</span>
                        <div className="ad-attn__body">
                          <p className="ad-attn__title">
                            <Link to={`/issues/${issue.complaintId}`}>{issue.title}</Link>
                          </p>
                          <p className="ad-attn__meta">
                            <span className="cf-mono">{issue.complaintId}</span> · {issue.location.city}, {issue.location.district} · {categoryInfo(issue.category).chip} · <span className={`cf-chip cf-status ${STATUS_CLASS[issue.status]}`}>{issue.status}</span>
                          </p>
                          <div className="d-flex flex-wrap gap-1 mt-2">
                            {reasons(issue).map((r) => <span key={r.text} className={`cf-chip ${r.tone}`}>{r.text}</span>)}
                          </div>
                        </div>
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => pickForUpdate(issue)}>Update</button>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="col-xl-4 d-flex flex-column gap-4">
                {/* ---- Pipeline ---- */}
                <div className="cf-panel">
                  <h2 className="cf-h3 mb-1">Status pipeline</h2>
                  <p className="cf-small cf-muted mb-3">Where every complaint is right now (merged ones not counted).</p>
                  <div className="ad-pipe" aria-hidden="true">
                    {PIPELINE.map((s) => <span key={s} className={`ad-pipe__seg ad-pipe__seg--${STATUS_CLASS[s].replace('cf-status--', '')}`} style={{ width: `${((counts[s] || 0) / pipelineTotal) * 100}%` }} />)}
                  </div>
                  <ul className="ad-legend">
                    {PIPELINE.map((s) => (
                      <li key={s}>
                        <button type="button" onClick={() => showList(s)}>
                          <span className={`ad-legend__dot ad-pipe__seg--${STATUS_CLASS[s].replace('cf-status--', '')}`} aria-hidden="true" />
                          {s}<strong>{counts[s] || 0}</strong>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* ---- Possible duplicates ---- */}
                <div className="cf-panel flex-grow-1">
                  <h2 className="cf-h3 mb-1">Possible duplicates</h2>
                  <p className="cf-small cf-muted mb-3">Open complaints of the same type in the same area.</p>
                  {!duplicateGroups.length && <p className="cf-small cf-muted m-0">None found.</p>}
                  <ul className="ad-dups">
                    {duplicateGroups.slice(0, 4).map((group) => (
                      <li key={group[0].complaintId}>
                        <div>
                          <strong>{plural(group.length, categoryInfo(group[0].category).chip.toLowerCase() + ' report')}</strong>
                          <span className="cf-small cf-muted d-block">{group[0].location.city}, {group[0].location.district}</span>
                        </div>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => reviewGroup(group)}>Compare</button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* ---- All complaints ---- */}
            <div className="cf-panel mt-4 p-0" ref={listRef}>
              <div className="px-3 px-md-4 pt-3 pt-md-4">
                <h2 className="cf-h3 mb-3">All complaints</h2>
                <div className="cf-tabs" role="tablist" aria-label="Admin sections">
                  {TABS.map((name) => (
                    <button key={name} type="button" role="tab" aria-selected={tab === name} className={`cf-tabs__tab${tab === name ? ' is-active' : ''}`} onClick={() => setTab(name)}>
                      {name}{counts[name] !== undefined && <span className="cf-tabs__count">{counts[name]}</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* ---- Status tabs: update panel + toolbar + table ---- */}
              {!['Flagged', 'Merge duplicates'].includes(tab) && (
                <>
                  <div ref={updateRef} className="ad-update-anchor" aria-live="polite">
                    {selected && (
                      <div className="ad-update">
                        <div className="d-flex flex-wrap justify-content-between gap-2 mb-3">
                          <div>
                            <p className="cf-label mb-1">Updating {selected.complaintId}</p>
                            <h3 className="cf-h4 m-0">{selected.title} <Link className="cf-small ms-2 fw-normal" to={`/issues/${selected.complaintId}`}>Open public page</Link></h3>
                          </div>
                          <button type="button" className="btn-close" aria-label="Close the update panel" onClick={() => setSelectedId('')} />
                        </div>
                        <dl className="ad-facts">
                          <div><dt>Status</dt><dd><span className={`cf-chip cf-status ${STATUS_CLASS[selected.status]}`}>{selected.status}</span></dd></div>
                          <div><dt>Open for</dt><dd>{plural(daysIgnored(selected), 'day')}</dd></div>
                          <div><dt>Reported by</dt><dd>{plural(selected.reportCount, 'person')}</dd></div>
                          <div><dt>Upvotes</dt><dd>{selected.upvotes}</dd></div>
                          <div><dt>Severity</dt><dd>{selected.severity}</dd></div>
                          <div><dt>Priority</dt><dd>{priorityScore(selected)}</dd></div>
                        </dl>
                        {lastNote && (
                          <p className="cf-small cf-muted mb-3">
                            Last update {new Date(lastNote.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}: “{lastNote.note || lastNote.status}”
                          </p>
                        )}
                        <div className="row g-3 align-items-end">
                          <div className="col-md-3">
                            <label className="form-label" htmlFor="a-status">New Status</label>
                            <select id="a-status" className="form-select" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                              {['Reported', 'Acknowledged', 'In Progress', 'Resolved'].map((s) => <option key={s}>{s}</option>)}
                            </select>
                          </div>
                          <div className="col-md-7">
                            <label className="form-label" htmlFor="a-note">Add an update message (shown publicly as an official note)</label>
                            <input id="a-note" className="form-control" maxLength={500} placeholder="Work has started on filling the pothole." value={note} onChange={(e) => setNote(e.target.value)} />
                          </div>
                          <div className="col-md-2 d-grid">
                            <button type="button" className="btn btn-primary" onClick={saveStatus} disabled={busy}>Save Update</button>
                          </div>
                        </div>
                        <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
                          <span className="cf-small cf-muted">Quick notes:</span>
                          {NOTE_TEMPLATES.map((tpl) => (
                            <button key={tpl.status} type="button" className="cf-filter" onClick={() => { setNewStatus(tpl.status); setNote(tpl.text); }}>
                              {tpl.status}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="ad-toolbar">
                    <div className="cf-search flex-grow-1">
                      <Icon name="search" />
                      <label className="visually-hidden" htmlFor="a-search">Search complaints</label>
                      <input id="a-search" className="form-control" type="search" placeholder="Search by ID, title or area" value={query} onChange={(e) => setQuery(e.target.value)} />
                    </div>
                    <select className="form-select" aria-label="Show" value={show} onChange={(e) => setShow(e.target.value)}>
                      <option value="all">Show: everything</option>
                      <option value="escalated">Show: escalated only</option>
                      <option value="quiet">Show: no update in 7+ days</option>
                    </select>
                    <select className="form-select" aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)}>
                      <option value="priority">Sort: highest priority</option>
                      <option value="oldest">Sort: oldest first</option>
                      <option value="newest">Sort: newest first</option>
                    </select>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0 cf-admin-table">
                      <caption className="visually-hidden">Complaints, {visible.length} shown</caption>
                      <thead>
                        <tr>
                          <th scope="col">Complaint</th>
                          <th scope="col">Severity</th>
                          <th scope="col" className="text-end">Reports</th>
                          <th scope="col" className="text-end">Open for</th>
                          <th scope="col" className="text-end">Priority</th>
                          <th scope="col">Status</th>
                          <th scope="col" className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visible.slice(0, limit).map((issue) => {
                          const days = daysIgnored(issue);
                          return (
                            <tr key={issue.complaintId} className={issue.complaintId === selectedId ? 'is-selected' : ''}>
                              <td>
                                <span className="ad-row__title">{issue.title}</span>
                                <span className="ad-row__meta">
                                  <span className="cf-mono">{issue.complaintId}</span> · {categoryInfo(issue.category).chip} · {issue.location.city}, {issue.location.district}
                                </span>
                                {(issue.isHidden || issue.flagsCount > 0 || isEscalated(issue)) && (
                                  <span className="d-flex flex-wrap gap-1 mt-1">
                                    {isEscalated(issue) && <span className="cf-chip cf-escalated">Escalated</span>}
                                    {issue.isHidden && <span className="cf-chip cf-escalated">Hidden</span>}
                                    {issue.flagsCount > 0 && <span className="cf-chip cf-status--acknowledged">{plural(issue.flagsCount, 'flag')}</span>}
                                  </span>
                                )}
                              </td>
                              <td><span className={`cf-chip ${SEVERITY_CLASS[issue.severity] || ''}`}>{issue.severity}</span></td>
                              <td className="text-end">{issue.reportCount}</td>
                              <td className="text-end text-nowrap">{OPEN.includes(issue.status) ? plural(days, 'day') : '–'}</td>
                              <td className="text-end"><strong>{priorityScore(issue)}</strong></td>
                              <td><span className={`cf-chip cf-status ${STATUS_CLASS[issue.status] || ''}`}>{issue.status}</span></td>
                              <td className="text-end text-nowrap">
                                {issue.status !== 'Merged' && (
                                  <button type="button" className="btn btn-primary btn-sm me-1" onClick={() => pickForUpdate(issue)} aria-label={`Update ${issue.complaintId}`}>Update</button>
                                )}
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setToDelete(issue)} aria-label={`Delete ${issue.complaintId}`}>Delete</button>
                              </td>
                            </tr>
                          );
                        })}
                        {!visible.length && <tr><td colSpan="7" className="text-center cf-muted py-4">No complaints match. Try another tab, search or filter.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  {visible.length > limit && (
                    <div className="ad-more">
                      <span className="cf-small cf-muted me-3">Showing {limit} of {visible.length}</span>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLimit(visible.length)}>Show all {visible.length} complaints</button>
                    </div>
                  )}
                </>
              )}

              {/* ---- Flagged queue ---- */}
              {tab === 'Flagged' && (
                <div className="p-3 p-md-4">
                  {!flagged.length && <div className="cf-empty"><p className="m-0 cf-muted">No flagged issues. Nice and quiet.</p></div>}
                  <div className="row g-3">
                    {flagged.map((issue) => (
                      <div className="col-md-6" key={issue.complaintId}>
                        <div className="cf-panel h-100">
                          <div className="d-flex justify-content-between gap-2 mb-2">
                            <span className="cf-mono cf-small">{issue.complaintId}</span>
                            <span className={`cf-chip cf-status ${issue.isHidden ? 'cf-escalated' : 'cf-status--acknowledged'}`}>{issue.isHidden ? 'Hidden' : 'Visible'} · {plural(issue.flagsCount, 'flag')}</span>
                          </div>
                          <h3 className="cf-card__title mt-0">{issue.title}</h3>
                          <p className="cf-small cf-muted">{issue.description}</p>
                          <p className="cf-label mb-1">Why residents flagged it</p>
                          <ul className="cf-small mb-3">
                            {issue.flags.map((f, i) => <li key={i}>{f.reason}</li>)}
                          </ul>
                          <div className="d-flex gap-2">
                            <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => restore(issue.complaintId)} disabled={busy}>Restore</button>
                            <button type="button" className="btn btn-danger btn-sm" onClick={() => setToDelete(issue)} disabled={busy}>Delete spam</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ---- Merge tool ---- */}
              {tab === 'Merge duplicates' && (
                <div className="p-3 p-md-4">
                  <p className="cf-muted mb-4">Pick two reports of the same problem. The duplicate's supporters, photos and comments move to the main issue, and anyone tracking the duplicate is pointed to the main one.</p>
                  <div className="row g-3 mb-4">
                    {[['dup', 'Duplicate'], ['master', 'Main (master)']].map(([key, label]) => (
                      <div className="col-md-6" key={key}>
                        <label className="form-label" htmlFor={`m-${key}`}>{label} issue</label>
                        <select id={`m-${key}`} className="form-select" value={merge[key]} onChange={(e) => setMerge({ ...merge, [key]: e.target.value })}>
                          <option value="">Choose an open issue</option>
                          {openIssues.map((i) => (
                            <option key={i.complaintId} value={i.complaintId} disabled={i.complaintId === merge[key === 'dup' ? 'master' : 'dup']}>
                              {i.complaintId} · {i.title} ({i.location.city})
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="row g-3">
                    <div className="col-md-6"><CompareCard issue={issues.find((i) => i.complaintId === merge.dup)} label="Duplicate" /></div>
                    <div className="col-md-6"><CompareCard issue={issues.find((i) => i.complaintId === merge.master)} label="Main" /></div>
                  </div>
                  <div className="d-flex flex-wrap justify-content-between gap-2 mt-4">
                    <button type="button" className="btn btn-ghost" onClick={() => setMerge({ dup: merge.master, master: merge.dup })} disabled={!merge.dup && !merge.master}>⇄ Swap main and duplicate</button>
                    <button type="button" className="btn btn-primary" onClick={doMerge} disabled={busy || !merge.dup || !merge.master}>Confirm merge</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <Modal
        open={!!toDelete}
        title="Delete this issue?"
        onClose={() => setToDelete(null)}
        footer={<><button type="button" className="btn btn-ghost" onClick={() => setToDelete(null)}>Cancel</button><button type="button" className="btn btn-danger" onClick={confirmDelete}>Delete permanently</button></>}
      >
        {toDelete && <p className="m-0"><strong>{toDelete.complaintId}</strong> · {toDelete.title}. This cannot be undone, and its uploaded photos are deleted too.</p>}
      </Modal>
    </section>
  );
}
