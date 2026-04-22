import { Link } from 'react-router-dom';

import './NotFoundPage.css';

const NotFoundPage = () => {
  return (
    <section className="not-found-page container">
      <div className="not-found-page__card surface">
        <span className="not-found-page__code">404</span>
        <h1>Trang không tồn tại</h1>
        <p>Đường dẫn bạn vừa truy cập không hợp lệ hoặc đã bị xóa.</p>
        <Link to="/" className="btn btn-primary">
          Quay về trang chủ
        </Link>
      </div>
    </section>
  );
};

export default NotFoundPage;
