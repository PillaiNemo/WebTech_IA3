// HowItWorks: four numbered steps joined by a line, each with a tinted icon.

import Icon from '../../components/Icon.jsx';
import useT from '../../hooks/useT.js';

export default function HowItWorks({ steps }) {
  const t = useT();

  return (
    <section className="lp-block container-xl" id="how" aria-labelledby="how-title">
      <div className="lp-how">
        <div className="mb-4">
          <h2 id="how-title" className="lp-block__title mb-1" data-reveal>{t('how.title')}</h2>
          <p className="cf-muted m-0" data-reveal>{t('how.sub')}</p>
        </div>

        <ol className="lp-how__steps" data-stagger>
          {steps.map((step, i) => (
            <li key={step.key} data-reveal>
              <span className="lp-how__head">
                <span className={`lp-how__icon lp-how__icon--${step.tone}`}>
                  <Icon name={step.icon} size={24} />
                </span>
                <span className="lp-how__line" aria-hidden="true" />
              </span>
              <span className="lp-how__num">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="lp-how__title">{t(`${step.key}.title`)}</h3>
              <p className="lp-how__text">{t(`${step.key}.text`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
