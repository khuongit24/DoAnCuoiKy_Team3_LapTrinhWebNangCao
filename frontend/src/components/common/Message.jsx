import { FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi';

import './Message.css';

const ICON_MAP = {
  error: FiAlertCircle,
  success: FiCheckCircle,
  info: FiInfo,
  warning: FiAlertTriangle,
};

const Message = ({ variant = 'info', children, onClose }) => {
  const Icon = ICON_MAP[variant] || ICON_MAP.info;

  return (
    <div className={`message message--${variant}`} role="alert">
      <div className="message__content">
        <Icon aria-hidden="true" />
        <p>{children}</p>
      </div>
      {typeof onClose === 'function' && (
        <button type="button" className="message__close" onClick={onClose} aria-label="Dong thong bao">
          <FiX />
        </button>
      )}
    </div>
  );
};

export default Message;
