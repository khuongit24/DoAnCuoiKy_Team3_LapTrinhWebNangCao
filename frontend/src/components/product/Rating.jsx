import { FaRegStar, FaStar, FaStarHalfAlt } from 'react-icons/fa';

import './Rating.css';

const resolveStarType = (value, starIndex) => {
  if (value >= starIndex) {
    return 'full';
  }

  if (value >= starIndex - 0.5) {
    return 'half';
  }

  return 'empty';
};

const Rating = ({ value = 0, text = '', className = '' }) => {
  const normalizedValueRaw = Number(value);
  const normalizedValue = Number.isFinite(normalizedValueRaw)
    ? Math.min(Math.max(normalizedValueRaw, 0), 5)
    : 0;

  return (
    <div className={`rating ${className}`.trim()} aria-label={`Đánh giá ${normalizedValue} trên 5`}>
      <div className="rating__stars" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => {
          const starNumber = index + 1;
          const starType = resolveStarType(normalizedValue, starNumber);

          if (starType === 'full') {
            return <FaStar key={starNumber} className="rating__star rating__star--full" />;
          }

          if (starType === 'half') {
            return <FaStarHalfAlt key={starNumber} className="rating__star rating__star--half" />;
          }

          return <FaRegStar key={starNumber} className="rating__star rating__star--empty" />;
        })}
      </div>

      {text ? <span className="rating__text">{text}</span> : null}
    </div>
  );
};

export default Rating;