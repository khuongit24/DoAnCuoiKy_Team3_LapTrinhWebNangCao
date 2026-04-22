import './StatsCard.css';

const normalizeText = (value, fallback) => {
  const text = String(value ?? '').trim();

  if (!text) {
    return fallback;
  }

  return text;
};

const StatsCard = ({ icon, value, label, color = 'var(--color-primary-600)' }) => {
  const normalizedLabel = normalizeText(label, 'Thống kê');
  const normalizedValue = normalizeText(value, '0');

  return (
    <article
      className="admin-stats-card surface"
      style={{ '--admin-stats-card-accent': color }}
      aria-label={`${normalizedLabel}: ${normalizedValue}`}
    >
      <span className="admin-stats-card__icon-wrap" aria-hidden="true">
        <span className="admin-stats-card__icon">{icon || '?'}</span>
      </span>

      <div className="admin-stats-card__content">
        <p className="admin-stats-card__label">{normalizedLabel}</p>
        <p className="admin-stats-card__value">{normalizedValue}</p>
      </div>
    </article>
  );
};

export default StatsCard;