import { useMemo } from 'react';
import { FiMessageSquare } from 'react-icons/fi';

import { formatDate } from '../../utils/helpers';
import EmptyState from '../common/EmptyState';
import Rating from './Rating';
import './ReviewList.css';

const ReviewList = ({ reviews = [] }) => {
  const normalizedReviews = useMemo(() => {
    if (!Array.isArray(reviews)) {
      return [];
    }

    return [...reviews].sort((a, b) => {
      const firstDate = new Date(a?.createdAt || 0).getTime();
      const secondDate = new Date(b?.createdAt || 0).getTime();
      return secondDate - firstDate;
    });
  }, [reviews]);

  if (normalizedReviews.length === 0) {
    return (
      <EmptyState
        icon={<FiMessageSquare />}
        title="Chưa có đánh giá nào"
        description="Hãy trở thành người đầu tiên chia sẻ trải nghiệm về sản phẩm này."
      />
    );
  }

  return (
    <div className="review-list">
      {normalizedReviews.map((review, index) => {
        const reviewId = review?._id || `${review?.user || 'review'}-${index}`;

        return (
          <article key={reviewId} className="review-list__item surface">
            <header className="review-list__header">
              <div>
                <h4>{review?.name || 'Người dùng TechShop'}</h4>
                <p>{formatDate(review?.createdAt)}</p>
              </div>
              <Rating value={Number(review?.rating || 0)} />
            </header>

            <p className="review-list__comment">{review?.comment || 'Người dùng chưa để lại bình luận.'}</p>
          </article>
        );
      })}
    </div>
  );
};

export default ReviewList;