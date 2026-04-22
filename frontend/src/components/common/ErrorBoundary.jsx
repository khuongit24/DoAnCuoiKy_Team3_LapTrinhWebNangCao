import { Component } from 'react';
import { Link } from 'react-router-dom';

import './ErrorBoundary.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error) {
    const errorMessage = error instanceof Error && error.message
      ? error.message
      : 'Đã xảy ra lỗi không mong muốn.';

    return {
      hasError: true,
      errorMessage,
    };
  }

  componentDidCatch(error, errorInfo) {
    if (typeof this.props.onError === 'function') {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      errorMessage: '',
    });

    if (typeof this.props.onReset === 'function') {
      this.props.onReset();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <section className="error-boundary container" role="alert" aria-live="assertive">
        <div className="error-boundary__card surface">
          <p className="error-boundary__eyebrow">Có lỗi xảy ra</p>
          <h2 className="error-boundary__title">Không thể hiển thị nội dung trang</h2>
          <p className="error-boundary__description">
            Bạn có thể thử tải lại khu vực này hoặc quay về trang chủ để tiếp tục mua sắm.
          </p>

          {this.state.errorMessage ? (
            <p className="error-boundary__detail">Chi tiết: {this.state.errorMessage}</p>
          ) : null}

          <div className="error-boundary__actions">
            <button type="button" className="btn btn-primary" onClick={this.handleReset}>
              Thử lại
            </button>
            <Link to="/" className="btn btn-outline">
              Về trang chủ
            </Link>
          </div>
        </div>
      </section>
    );
  }
}

export default ErrorBoundary;