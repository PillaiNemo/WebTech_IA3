// Step 1: "What type of issue are you reporting?" as large icon cards.

import Icon from '../../components/Icon.jsx';
import categories from '../../data/categories.json';

export default function CategoryStep({ value, onChange, error }) {
  return (
    <fieldset>
      <legend className="cf-h4 mb-3">What type of issue are you reporting?</legend>
      <div className="row g-3" role="radiogroup" aria-label="Issue type">
        {categories.map((c) => (
          <div className="col-sm-6 col-xl-4 col-xxl-3" key={c.id}>
            <button
              type="button"
              role="radio"
              aria-checked={value === c.id}
              className={`cf-choice h-100${value === c.id ? ' is-selected' : ''}`}
              onClick={() => onChange(c.id)}
            >
              <span className="cf-choice__icon"><Icon name={`cat-${c.id}`} /></span>
              <span>
                <span className="cf-choice__title">{c.label}</span>
                <span className="cf-choice__hint">{c.hint}</span>
              </span>
            </button>
          </div>
        ))}
      </div>
      {error && <p className="text-danger mt-3 mb-0" role="alert">{error}</p>}
    </fieldset>
  );
}
