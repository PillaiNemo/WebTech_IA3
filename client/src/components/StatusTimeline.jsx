// StatusTimeline: Reported -> Acknowledged -> In Progress -> Resolved.
// Each step shows the date and official note from the issue's history.
// Steps already reached get a green tick, the current one a maroon dot.

import Icon from './Icon.jsx';

const STEPS = ['Reported', 'Acknowledged', 'In Progress', 'Resolved'];
const formatDate = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function StatusTimeline({ issue }) {
  const history = issue.statusHistory || [];
  const currentIndex = STEPS.indexOf(issue.status === 'Merged' ? 'Reported' : issue.status);

  // The latest history entry for each step (an issue can be reopened).
  const entryFor = (step) => [...history].reverse().find((h) => h.status === step);

  return (
    <ol className="cf-timeline">
      {STEPS.map((step, i) => {
        const entry = entryFor(step);
        const state = i < currentIndex || (i === currentIndex && step === 'Resolved') ? 'done' : i === currentIndex ? 'current' : 'todo';
        return (
          <li key={step} className={`cf-timeline__item is-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="cf-timeline__dot" aria-hidden="true">
              {state === 'done' && <Icon name="check" size={14} />}
            </span>
            <div>
              <p className="cf-timeline__title">{step}</p>
              {state !== 'todo' && entry && <p className="cf-timeline__date">{formatDate(entry.date)}</p>}
              <p className="cf-timeline__note">
                {state === 'todo' ? 'Waiting for this step.' : (entry && entry.note) || ''}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
