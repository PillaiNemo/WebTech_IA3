// IssueDetail.jsx: route "/issues/:complaintId".
// Photo gallery, details, status timeline, map, comments, and the actions:
// Me too, Add my support, Still not fixed and Report as spam.

import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import MapEmbed, { osmLink } from '../components/MapEmbed.jsx';
import Modal from '../components/Modal.jsx';
import PhotoPicker from '../components/PhotoPicker.jsx';
import StatusTimeline from '../components/StatusTimeline.jsx';
import { ErrorState } from '../components/States.jsx';
import { FALLBACK_IMAGE } from '../components/IssueCard.jsx';
import { getJSON, postJSON } from '../services/api.js';
import { getVoterToken } from '../utils/voter.js';
import { toast } from '../utils/toast.js';
import { STATUS_CLASS, categoryInfo, daysIgnored, daysToFix, isEscalated, priorityScore } from '../utils/issueMath.js';

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function IssueDetail() {
  const { complaintId } = useParams();
  const [issue, setIssue] = useState(null);
  const [error, setError] = useState(null);
  const [photo, setPhoto] = useState(0);
  const [modal, setModal] = useState(''); // '' | 'support' | 'flag'
  const [supportNote, setSupportNote] = useState('');
  const [supportImage, setSupportImage] = useState('');
  const [flagReason, setFlagReason] = useState('Spam or advertisement');
  const [comment, setComment] = useState({ name: '', text: '', website: '' });
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      setIssue(await getJSON(`/api/issues/${encodeURIComponent(complaintId)}`));
    } catch (err) {
      setError(err);
    }
  }, [complaintId]);

  useEffect(() => { load(); }, [load]);

  // Every action posts with the anonymous voter token, then shows a toast.
  async function act(name, url, body, onSuccess) {
    setBusy(name);
    try {
      const data = await postJSON(url, { voterToken: getVoterToken(), ...body });
      onSuccess(data);
    } catch (err) {
      toast(err.status === 409 ? 'info' : 'error', err.status === 409 ? 'Already counted' : 'Something went wrong', err.message);
    } finally {
      setBusy('');
    }
  }

  const base = `/api/issues/${encodeURIComponent(complaintId)}`;
  const upvote = () => act('upvote', `${base}/upvote`, {}, (d) => {
    setIssue((i) => ({ ...i, upvotes: d.upvotes }));
    const others = d.upvotes - 1;
    toast('success', 'Me too!', others ? `You and ${others} other ${others === 1 ? 'person want' : 'people want'} this fixed.` : 'You are the first to say "me too".');
  });
  const support = () => act('support', `${base}/support`, { note: supportNote, image: supportImage || undefined }, (d) => {
    setIssue(d);
    setModal('');
    setSupportNote('');
    setSupportImage('');
    toast('success', 'Support added', `This issue is now reported by ${d.reportCount} people.`);
  });
  const flag = () => act('flag', `${base}/flag`, { reason: flagReason }, (d) => {
    setModal('');
    toast('info', 'Thanks for telling us', d.hidden ? 'This issue is now hidden until a moderator reviews it.' : 'A moderator will review it.');
  });
  const notFixed = () => act('notfixed', `${base}/not-fixed`, {}, (d) => {
    toast(d.reopened ? 'warning' : 'info', d.reopened ? 'Issue reopened' : 'Vote counted', d.reopened ? 'Three people said it is still not fixed, so it is open again.' : `${d.votes} of ${d.needed} votes needed to reopen it.`);
    if (d.reopened) load();
  });
  const sendComment = (e) => {
    e.preventDefault();
    if (comment.text.trim().length < 3) {
      toast('error', 'Comment too short', 'Write at least 3 characters.');
      return;
    }
    act('comment', `${base}/comments`, comment, (c) => {
      setIssue((i) => ({ ...i, comments: [...i.comments, c] }));
      setComment({ name: comment.name, text: '', website: '' });
    });
  };

  if (error) {
    return (
      <section className="cf-section pt-4">
        <div className="container-xl">
          <Link className="cf-back" to="/issues"><span><Icon name="back" size={14} /></span> Back to Issues</Link>
          <div className="mt-4"><ErrorState message={error.message} onRetry={error.status === 404 ? null : load} /></div>
        </div>
      </section>
    );
  }

  if (!issue) {
    return (
      <section className="cf-section pt-4" aria-label="Loading issue">
        <div className="container-xl">
          <div className="cf-skel cf-skel--title mb-4" style={{ width: 240 }} />
          <div className="row g-4"><div className="col-lg-7"><div className="cf-skel" style={{ height: 380 }} /></div><div className="col-lg-5"><div className="cf-skel" style={{ height: 380 }} /></div></div>
        </div>
      </section>
    );
  }

  const category = categoryInfo(issue.category);
  const photos = issue.imageUrls.length ? issue.imageUrls : [FALLBACK_IMAGE];
  const days = daysIgnored(issue);
  const fixedIn = daysToFix(issue);
  const open = ['Reported', 'Acknowledged', 'In Progress'].includes(issue.status);
  const hasPoint = Number.isFinite(issue.location.lat);

  return (
    <section className="cf-section pt-4">
      <div className="container-xl">
        <Link className="cf-back" to="/issues"><span><Icon name="back" size={14} /></span> Back to Issues</Link>
        <h1 className="cf-h1 mt-2 mb-4">Issue Details</h1>

        {issue.status === 'Merged' && issue.mergedInto && (
          <div className="cf-notice mb-4" role="status">
            This report was merged into <Link to={`/issues/${issue.mergedInto}`}>{issue.mergedInto}</Link>, the main report of the same problem.
          </div>
        )}

        <div className="row g-4">
          <div className="col-lg-7">
            <div className="cf-panel">
              <div className="row g-4">
                <div className="col-md-5">
                  <div className="cf-gallery">
                    <img className="cf-gallery__main" src={photos[photo]} alt={issue.imageUrls.length ? `Photo ${photo + 1} of ${issue.title}` : ''} />
                    {photos.length > 1 && (
                      <>
                        <span className="cf-gallery__count">{photo + 1} / {photos.length}</span>
                        <div className="cf-gallery__thumbs">
                          {photos.map((src, i) => (
                            <button key={src} type="button" onClick={() => setPhoto(i)} aria-label={`Show photo ${i + 1}`} aria-pressed={i === photo}>
                              <img src={src} alt="" />
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="col-md-7">
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    <span className={`cf-chip cf-status ${STATUS_CLASS[issue.status] || ''}`}>{issue.status}</span>
                    <span className={`cf-chip cf-chip--${category.tone}`}>{category.chip}</span>
                    {isEscalated(issue) && <span className="cf-chip cf-status cf-escalated">Escalated</span>}
                    {issue.reopenCount > 0 && open && <span className="cf-chip cf-status cf-status--reopened">Reopened</span>}
                  </div>
                  <h2 className="cf-h3 mb-1">{issue.title}</h2>
                  <p className="cf-small cf-muted mb-3">Complaint ID <strong className="cf-mono">{issue.complaintId}</strong></p>
                  <dl className="cf-facts">
                    <div><dt>{open ? 'Days ignored' : 'Fixed in'}</dt><dd className={open && days > 30 ? 'text-danger' : ''}>{open ? days : fixedIn ?? '-'} days</dd></div>
                    <div><dt>Reported by</dt><dd>{issue.reportCount} {issue.reportCount === 1 ? 'person' : 'people'}</dd></div>
                    <div><dt>Upvotes</dt><dd>{issue.upvotes}</dd></div>
                    <div><dt>Priority</dt><dd>{priorityScore(issue)}</dd></div>
                  </dl>
                </div>
              </div>

              <h3 className="cf-label mt-4 mb-2">Description</h3>
              <p>{issue.description}</p>

              <h3 className="cf-label mt-4 mb-2">Location</h3>
              <p className="d-flex gap-2 mb-1">
                <Icon name="pin" className="cf-pin mt-1" size={16} />
                <span>{issue.location.city}, {issue.location.district}, {issue.location.state}{issue.location.landmark && <><br /><span className="cf-muted">{issue.location.landmark}</span></>}</span>
              </p>
              <p className="cf-small cf-muted">Reported on {formatDate(issue.createdAt)} by {issue.reporter.anonymous ? 'an anonymous resident' : issue.reporter.name}</p>

              {/* Actions */}
              <div className="d-flex flex-wrap gap-2 mt-4">
                <button type="button" className="btn btn-primary" onClick={upvote} disabled={busy === 'upvote'}>
                  <Icon name="heart" size={16} /> Me too · {issue.upvotes}
                </button>
                {open && <button type="button" className="btn btn-outline-primary" onClick={() => setModal('support')}>Add my support</button>}
                {issue.status === 'Resolved' && (
                  <button type="button" className="btn btn-outline-primary" onClick={notFixed} disabled={busy === 'notfixed'}>Still not fixed ({issue.reopenVotes}/3)</button>
                )}
                <button type="button" className="btn btn-ghost ms-auto" onClick={() => setModal('flag')}><Icon name="flag" size={15} /> Report as spam</button>
              </div>
            </div>

            {/* Comments */}
            <div className="cf-panel mt-4">
              <h2 className="cf-h3 mb-3">Comments ({issue.comments.length})</h2>
              {issue.comments.length === 0 && <p className="cf-muted">No comments yet. Add what you have seen.</p>}
              <ul className="cf-comments">
                {issue.comments.map((c) => (
                  <li key={c.id} className={c.official ? 'is-official' : ''}>
                    <p className="cf-comments__who">{c.name}{c.official && <span className="cf-chip cf-status cf-status--resolved ms-2">Official</span>} <span>{formatDate(c.date)}</span></p>
                    <p className="m-0">{c.text}</p>
                  </li>
                ))}
              </ul>
              <form className="row g-2 mt-2" onSubmit={sendComment} noValidate>
                <div className="col-sm-4">
                  <label className="visually-hidden" htmlFor="c-name">Your name</label>
                  <input id="c-name" className="form-control" placeholder="Your name (optional)" maxLength={60} value={comment.name} onChange={(e) => setComment({ ...comment, name: e.target.value })} />
                </div>
                <div className="col-sm-8">
                  <label className="visually-hidden" htmlFor="c-text">Comment</label>
                  <input id="c-text" className="form-control" placeholder="Add a comment" maxLength={1000} value={comment.text} onChange={(e) => setComment({ ...comment, text: e.target.value })} />
                </div>
                <div className="cf-hp" aria-hidden="true">
                  <label htmlFor="c-website">Leave this field empty</label>
                  <input id="c-website" tabIndex={-1} autoComplete="off" value={comment.website} onChange={(e) => setComment({ ...comment, website: e.target.value })} />
                </div>
                <div className="col-12 text-end"><button className="btn btn-primary btn-sm" type="submit" disabled={busy === 'comment'}>Post comment</button></div>
              </form>
            </div>
          </div>

          <div className="col-lg-5">
            <div className="cf-panel">
              <h2 className="cf-h4 mb-3">Status Updates</h2>
              <StatusTimeline issue={issue} />
              {hasPoint && (
                <a className="btn btn-ghost w-100 mt-3" href={osmLink(issue.location.lat, issue.location.lng)} target="_blank" rel="noreferrer">
                  <Icon name="map" size={16} /> View on Map
                </a>
              )}
            </div>
            {hasPoint && (
              <div className="cf-panel mt-4 p-2">
                <MapEmbed lat={issue.location.lat} lng={issue.location.lng} height={240} />
              </div>
            )}
            {issue.mergedIssues.length > 0 && (
              <p className="cf-small cf-muted mt-3">Merged reports: {issue.mergedIssues.join(', ')}</p>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={modal === 'support'}
        title="Add my support"
        onClose={() => setModal('')}
        footer={<><button type="button" className="btn btn-ghost" onClick={() => setModal('')}>Cancel</button><button type="button" className="btn btn-primary" onClick={support} disabled={busy === 'support'}>Add my support</button></>}
      >
        <p className="cf-muted">You have the same problem. Your support makes this report stronger instead of creating a duplicate. A note and a photo are optional.</p>
        <label className="form-label" htmlFor="s-note">Note (optional)</label>
        <textarea id="s-note" className="form-control mb-3" rows="3" maxLength={500} value={supportNote} onChange={(e) => setSupportNote(e.target.value)} placeholder="It is still there this morning..." />
        <PhotoPicker value={supportImage} onChange={setSupportImage} label="Photo (optional)" />
      </Modal>

      <Modal
        open={modal === 'flag'}
        title="Report as spam or fake"
        onClose={() => setModal('')}
        footer={<><button type="button" className="btn btn-ghost" onClick={() => setModal('')}>Cancel</button><button type="button" className="btn btn-danger" onClick={flag} disabled={busy === 'flag'}>Send report</button></>}
      >
        <p className="cf-muted">After three reports from different people, the issue is hidden until a moderator checks it.</p>
        <label className="form-label" htmlFor="f-reason">Reason</label>
        <select id="f-reason" className="form-select" value={flagReason} onChange={(e) => setFlagReason(e.target.value)}>
          <option>Spam or advertisement</option>
          <option>Fake or test report</option>
          <option>Offensive content</option>
          <option>Already fixed long ago</option>
        </select>
      </Modal>
    </section>
  );
}
