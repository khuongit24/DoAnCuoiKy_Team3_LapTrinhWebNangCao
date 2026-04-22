import { useMemo, useState } from 'react';
import { FiEye, FiEyeOff, FiLock, FiMail } from 'react-icons/fi';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import Message from '../components/common/Message';
import { useAuth } from '../hooks/useAuth';
import { getApiErrorMessage, getFieldErrors } from '../utils/errorUtils';
import './LoginPage.css';

const EMAIL_REGEX = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const redirectPath = useMemo(() => location.state?.from?.pathname || '/', [location.state]);

  if (isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }

  const handleFieldChange = (fieldName, value) => {
    setFormData((previous) => ({
      ...previous,
      [fieldName]: value,
    }));

    setFieldErrors((previous) => {
      if (!previous[fieldName]) {
        return previous;
      }

      return {
        ...previous,
        [fieldName]: '',
      };
    });
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.email.trim()) {
      nextErrors.email = 'Vui lòng nhập email';
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      nextErrors.email = 'Email không hợp lệ';
    }

    if (!formData.password.trim()) {
      nextErrors.password = 'Vui lòng nhập mật khẩu';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setGeneralError('');

    try {
      await login(formData.email.trim().toLowerCase(), formData.password);
      navigate(redirectPath, { replace: true });
    } catch (error) {
      setGeneralError(getApiErrorMessage(error, 'Đăng nhập thất bại'));
      setFieldErrors((previous) => ({
        ...previous,
        ...getFieldErrors(error),
      }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth-page container">
      <div className="auth-card surface">
        <header>
          <h1>Đăng nhập</h1>
          <p>Nhập tài khoản để truy cập profile, đơn hàng và giỏ hàng của bạn.</p>
        </header>

        {generalError ? (
          <Message variant="error" onClose={() => setGeneralError('')}>
            {generalError}
          </Message>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email
            </label>
            <div className="auth-input-wrap">
              <FiMail />
              <input
                id="email"
                className="form-input"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={(event) => handleFieldChange('email', event.target.value)}
                placeholder="you@example.com"
              />
            </div>
            {fieldErrors.email ? <small className="text-danger">{fieldErrors.email}</small> : null}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Mật khẩu
            </label>
            <div className="auth-input-wrap">
              <FiLock />
              <input
                id="password"
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={formData.password}
                onChange={(event) => handleFieldChange('password', event.target.value)}
                placeholder="Nhập mật khẩu"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {fieldErrors.password ? <small className="text-danger">{fieldErrors.password}</small> : null}
          </div>

          <button className="btn btn-primary auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>

        <footer className="auth-footer">
          <span>Chưa có tài khoản?</span>
          <Link to="/register">Đăng ký ngay</Link>
        </footer>

        <p className="auth-admin-hint">
          Tài khoản quản trị? <Link to="/admin/login">Đăng nhập tại cổng admin</Link>
        </p>
      </div>
    </section>
  );
};

export default LoginPage;
