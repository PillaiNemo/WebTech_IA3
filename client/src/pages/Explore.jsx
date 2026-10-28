// Explore.jsx: route "/issues". The public feed with search, filters,
// sorting and "Load more". The filters live in the URL (?category=pothole),
// so a filtered view can be bookmarked or shared.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import IssueCard from '../components/IssueCard.jsx';
import Icon from '../components/Icon.jsx';
import { EmptyState, ErrorState, PageHeader, SkeletonCard } from '../components/States.jsx';
import useReveal from '../hooks/useReveal.js';
import useT from '../hooks/useT.js';
import categories from '../data/categories.json';
import locations from '../data/locations.json';
import { getJSON, postJSON } from '../services/api.js';
import { getVoterToken } from '../utils/voter.js';
import { toast } from '../utils/toast.js';

const PAGE_SIZE = 12;
const STATUSES = ['Reported', 'Acknowledged', 'In Progress', 'Resolved'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
const FILTER_KEYS = ['q', 'category', 'status', 'state', 'district', 'severity', 'sort'];

export default function Explore() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || '');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [upvoted, setUpvoted] = useState({});
  const listRef = useRef(null);

  const filters = useMemo(() => Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || ''])), [params]);

  // A search from the header changes ?q= while this page is open: show it in the box.
  const qParam = params.get('q') || '';
  useEffect(() => { setSearch(qParam); }, [qParam]);
  const districts = useMemo(() => {
    const state = locations.states.find((s) => s.name === filters.state);
    return state ? state.districts : [];
  }, [filters.state]);

  // Change one filter in the URL (empty value = remove it).
  const setFilter = useCallback((key, value) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      if (key === 'state') next.delete('district');
      return next;
    }, { replace: true });
  }, [setParams]);

  // Debounce: only search 350 ms after the person stops typing.
  useEffect(() => {
    const timer = setTimeout(() => { if (search !== filters.q) setFilter('q', search.trim()); }, 350);
    return () => clearTimeout(timer);
  }, [search, filters.q, setFilter]);

  const load = useCallback(async (pageToLoad, append) => {
    if (!append) setStatus('loading');
    try {
      const query = new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), page: pageToLoad, limit: PAGE_SIZE });
      const data = await getJSON(`/api/issues?${query}`);
      setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      setTotal(data.total);
      setPage(data.page);
      setPages(data.pages);
      setStatus('ready');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }, [filters]);

  useEffect(() => { load(1, false); }, [load]);
  useReveal(listRef, { enabled: status === 'ready', key: items });

  // "Me too": one upvote per person (the server checks the voter hash).
  const upvote = useCallback(async (issue) => {
    try {
      const data = await postJSON(`/api/issues/${issue.complaintId}/upvote`, { voterToken: getVoterToken() });
      setItems((prev) => prev.map((i) => (i.complaintId === issue.complaintId ? { ...i, upvotes: data.upvotes } : i)));
      setUpvoted((prev) => ({ ...prev, [issue.complaintId]: true }));
      toast('success', 'Thanks for your support', `${issue.title} now has ${data.upvotes} upvotes.`);
    } catch (err) {
      if (err.status === 409) setUpvoted((prev) => ({ ...prev, [issue.complaintId]: true }));
      toast(err.status === 409 ? 'info' : 'error', err.status === 409 ? 'Already counted' : 'Could not upvote', err.message);
    }
  }, []);

  const hasFilters = FILTER_KEYS.some((k) => k !== 'sort' && filters[k]);

  return (
    <section className="cf-section pt-4">
      <div className="container-xl">
        <PageHeader title={t('explore.title')} text={t('explore.sub')} />

        <form className="cf-filters" role="search" onSubmit={(e) => { e.preventDefault(); setFilter('q', search.trim()); }}>
          <div className="cf-search cf-filters__search">
            <Icon name="search" />
            <label className="visually-hidden" htmlFor="f-search">Search issues</label>
            <input id="f-search" className="form-control" type="search" placeholder={t('explore.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-select" aria-label="Category" value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
            <option value="">{t('explore.allCategories')}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select className="form-select" aria-label="Status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">{t('explore.allStatuses')}</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="form-select" aria-label="State" value={filters.state} onChange={(e) => setFilter('state', e.target.value)}>
            <option value="">{t('explore.allStates')}</option>
            {locations.states.map((s) => <option key={s.name}>{s.name}</option>)}
          </select>
          <select className="form-select" aria-label="District" value={filters.district} onChange={(e) => setFilter('district', e.target.value)} disabled={!districts.length}>
            <option value="">{t('explore.allDistricts')}</option>
            {districts.map((d) => <option key={d.name}>{d.name}</option>)}
          </select>
          <select className="form-select" aria-label="Severity" value={filters.severity} onChange={(e) => setFilter('severity', e.target.value)}>
            <option value="">{t('explore.allSeverities')}</option>
            {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="form-select" aria-label="Sort by" value={filters.sort || 'newest'} onChange={(e) => setFilter('sort', e.target.value === 'newest' ? '' : e.target.value)}>
            <option value="newest">{t('sort.newest')}</option>
            <option value="upvotes">{t('sort.upvotes')}</option>
            <option value="unresolved">{t('sort.unresolved')}</option>
            <option value="priority">{t('sort.priority')}</option>
          </select>
        </form>

        <div className="d-flex justify-content-between align-items-center my-3" aria-live="polite">
          <span className="cf-small cf-muted">{status === 'ready' ? t('explore.results', { n: total }) : ' '}</span>
          {hasFilters && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setParams({}, { replace: true }); }}>
              {t('explore.clear')}
            </button>
          )}
        </div>

        {status === 'error' && <ErrorState message={error} onRetry={() => load(1, false)} />}

        {status === 'loading' && (
          <div className="row g-4" aria-label={t('common.loading')}>
            {Array.from({ length: 8 }, (_, i) => <div className="col-sm-6 col-lg-4 col-xxl-3" key={i}><SkeletonCard /></div>)}
          </div>
        )}

        {status === 'ready' && !items.length && (
          <EmptyState title={t('explore.empty')} text={t('explore.emptyText')}>
            <Link className="btn btn-primary" to="/report">{t('nav.report')}</Link>
          </EmptyState>
        )}

        {status === 'ready' && items.length > 0 && (
          <>
            <div className="row g-4" ref={listRef} data-stagger>
              {items.map((issue) => (
                <div className="col-sm-6 col-lg-4 col-xxl-3" key={issue.complaintId} data-reveal>
                  <IssueCard issue={issue} onUpvote={upvote} upvoted={!!upvoted[issue.complaintId]} />
                </div>
              ))}
            </div>
            {page < pages && (
              <div className="text-center mt-5">
                <button type="button" className="btn btn-outline-primary" onClick={() => load(page + 1, true)}>{t('explore.loadMore')}</button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
