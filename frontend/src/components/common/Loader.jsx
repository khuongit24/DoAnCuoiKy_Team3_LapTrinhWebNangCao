import './Loader.css';

const Loader = ({ fullPage = false, overlay = false, inline = false, text = 'Đang tải dữ liệu...' }) => {
  const classNames = [
    'loader',
    fullPage ? 'loader--full-page' : '',
    overlay ? 'loader--overlay' : '',
    inline ? 'loader--inline' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} role="status" aria-live="polite" aria-busy="true">
      <span className="loader__spinner" />
      <span className="loader__text">{text}</span>
    </div>
  );
};

export default Loader;
