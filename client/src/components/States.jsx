// Loading, empty and error states shared by every page, and the page heading.

import { Link } from 'react-router-dom';
import useT from '../hooks/useT.js';

export function SkeletonCard() {
  return (
    <div className="cf-card h-100" aria-hidden="true">
      <div className="cf-skel cf-skel--media" />
      <div className="cf-card__body">
        <div className="cf-skel cf-skel--chip" />
        <div className="cf-skel cf-skel--title" />
        <div className="cf-skel cf-skel--line" />
        <div className="cf-skel cf-skel--line" style={{ width: '55%' }} />
      </div>
    </div>
  );
}

export function EmptyState({ title, text, children }) {
  return (
    <div className="cf-empty">
      <img className="cf-empty__art" src="/images/08-botanical-branch-sketch.png" alt="" />
      <h2 className="cf-h3 mb-2">{title}</h2>
      {text && <p className="cf-muted mb-3">{text}</p>}
      {children}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="cf-empty" role="alert">
      <img className="cf-empty__art" src="/images/09-civic-map-pins.png" alt="" />
      <h2 className="cf-h3 mb-2">Something went wrong</h2>
      <p className="cf-muted mb-3">{message}</p>
      {onRetry && <button type="button" className="btn btn-outline-primary" onClick={onRetry}>Try again</button>}
    </div>
  );
}

// Page heading with a "Home / Page" breadcrumb above it.
export function PageHeader({ title, text, back }) {
  const t = useT();
  return (
    <div className="mb-4">
      {back}
      <nav aria-label="Breadcrumb">
        <ol className="cf-crumbs">
          <li><Link to="/">{t('nav.home')}</Link></li>
          <li aria-current="page">{title}</li>
        </ol>
      </nav>
      <h1 className="cf-h1 mb-1">{title}</h1>
      {text && <p className="cf-muted m-0">{text}</p>}
    </div>
  );
}
