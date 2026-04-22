import { useEffect, useId } from 'react';
import { FiX } from 'react-icons/fi';

import './Modal.css';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer = null,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}) => {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event) => {
      if (!closeOnEscape || event.key !== 'Escape') {
        return;
      }

      if (typeof onClose === 'function') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [closeOnEscape, isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleOverlayMouseDown = () => {
    if (!closeOnOverlayClick || typeof onClose !== 'function') {
      return;
    }

    onClose();
  };

  const stopPropagation = (event) => {
    event.stopPropagation();
  };

  return (
    <div className="modal" role="presentation" onMouseDown={handleOverlayMouseDown}>
      <div
        className="modal__panel surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        onMouseDown={stopPropagation}
      >
        <header className="modal__header">
          {title ? (
            <h2 id={titleId} className="modal__title">
              {title}
            </h2>
          ) : (
            <span className="sr-only">Noi dung hop thoai</span>
          )}

          <button
            type="button"
            className="modal__close"
            onClick={typeof onClose === 'function' ? onClose : undefined}
            aria-label="Dong hop thoai"
          >
            <FiX />
          </button>
        </header>

        <div className="modal__content">{children}</div>

        {footer ? <footer className="modal__footer">{footer}</footer> : null}
      </div>
    </div>
  );
};

export default Modal;
