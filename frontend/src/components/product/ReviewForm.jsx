import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiStar } from 'react-icons/fi';
import { Link, useLocation } from 'react-router-dom';

import { createReview } from '../../api/productApi';
import { useAuth } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../utils/errorUtils';

const MAX_COMMENT_LENGTH = 1000;

const ReviewForm = ({ productId, hasReviewed = false, onSubmitted }) => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loginState = useMemo(
    () => ({
      from: {
        pathname: location.pathname,
      },
    }),
    [location.pathname]
  );

  if (!isAuthenticated) {
    return (
      <div className="review-form review-form--locked surface">
        <p>
          Bạn cần đăng nhập để gửi đánh giá.{' '}
          <Link to="/login" state={loginState}>
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    );
  }

  if (hasReviewed) {
    return (
      <div className="review-form review-form--locked surface">
        <p>Bạn đã đánh giá sản phẩm này trước đó. Cảm ơn chia sẻ của bạn.</p>
      </div>
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const normalizedComment = comment.trim();

    if (!rating) {
      setError('Vui lòng chọn số sao đánh giá.');
      return;
    }

    if (normalizedComment.length < 10) {
      setError('Nhận xét cần ít nhất 10 ký tự.');
      return;
    }

    if (normalizedComment.length > MAX_COMMENT_LENGTH) {
      setError(`Nhận xét không được vượt quá ${MAX_COMMENT_LENGTH} ký tự.`);
      return;
    }

    setSubmitting(true);

    try {
      await createReview(productId, {
        rating,
        comment: normalizedComment,
      });

      setRating(0);
      setComment('');
      toast.success('Gửi đánh giá thành công');

      if (typeof onSubmitted === 'function') {
        onSubmitted();
      }
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, 'Không thể gửi đánh giá'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="review-form surface" onSubmit={handleSubmit}>
      <h4>Viết đánh giá của bạn</h4>

      <div className="review-form__stars" role="radiogroup" aria-label="Chọn số sao đánh giá">
        {[1, 2, 3, 4, 5].map((star) => {
          const isActive = rating >= star;

          return (
            <button
              key={star}
              type="button"
              className={`review-form__star ${isActive ? 'is-active' : ''}`}
              onClick={() => setRating(star)}
              aria-label={`${star} sao`}
            >
              <FiStar />
            </button>
          );
        })}
      </div>

      <label className="form-label" htmlFor="review-comment">
        Nhận xét
      </label>
      <textarea
        id="review-comment"
        className="form-textarea"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={MAX_COMMENT_LENGTH}
        placeholder="Chia sẻ trải nghiệm sử dụng của bạn về sản phẩm..."
      />

      <p className="review-form__counter">
        {comment.trim().length}/{MAX_COMMENT_LENGTH} ký tự
      </p>

      {error ? <p className="text-danger">{error}</p> : null}

      <button className="btn btn-primary" type="submit" disabled={submitting}>
        {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
      </button>
    </form>
  );
};

export default ReviewForm;