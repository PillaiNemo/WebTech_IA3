// NotFound: shown for any address that does not match a route.

import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="cf-section lp-soon text-center">
      <div className="container-xl">
        <img className="lp-404-art" src="/images/09-civic-map-pins.png" alt="" />
        <p className="cf-label mt-4">Error 404</p>
        <h1 className="cf-h1 mb-3">We couldn't find that street.</h1>
        <p className="cf-muted mb-4">The link may be old or mistyped. Let's get you back on the map.</p>
        <Link className="btn btn-primary btn-lg" to="/">Return to Home</Link>
      </div>
    </section>
  );
}
