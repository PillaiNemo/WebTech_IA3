// Modal: an accessible dialog. Focus moves inside when it opens, Tab stays
// inside, Escape or the backdrop closes it, and focus returns afterwards.

import { useEffect, useRef } from 'react';

export default function Modal({ open, title, onClose, children, footer }) {
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const box = boxRef.current;
    const focusables = () => Array.from(box.querySelectorAll('button, [href], input, select, textarea')).filter((el) => !el.disabled);
    (focusables()[1] || focusables()[0] || box).focus(); // skip the × button

    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === items[items.length - 1]) { e.preventDefault(); items[0].focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.documentElement.style.overflow = '';
      if (previouslyFocused) previouslyFocused.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="cf-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cf-modal__box" role="dialog" aria-modal="true" aria-labelledby="cf-modal-title" ref={boxRef} tabIndex={-1}>
        <div className="cf-modal__head">
          <h2 id="cf-modal-title" className="cf-h3 m-0">{title}</h2>
          <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
        </div>
        <div className="cf-modal__body">{children}</div>
        {footer && <div className="cf-modal__foot">{footer}</div>}
      </div>
    </div>
  );
}
