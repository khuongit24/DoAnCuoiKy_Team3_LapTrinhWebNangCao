import { useMemo, useState } from 'react';
import { FiEye, FiEyeOff, FiLock, FiMail, FiUser } from 'react-icons/fi';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import Message from '../components/common/Message';
import { useAuth } from '../hooks/useAuth';
import { getApiErrorMessage, getFieldErrors } from '../utils/errorUtils';
import './RegisterPage.css';

const EMAIL_REGEX = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    if (!formData.name.trim()) {
      nextErrors.name = 'Vui lòng nhập họ tên';
    }

    if (!formData.email.trim()) {
      nextErrors.email = 'Vui lòng nhập email';
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      nextErrors.email = 'Email không hợp lệ';
    }

    if (!formData.password.trim()) {
      nextErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (formData.password.length < 6) {
      nextErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (!formData.confirmPassword.trim()) {
      nextErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    } else if (formData.confirmPassword !== formData.password) {
      nextErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
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
      await register(formData.name.trim(), formData.email.trim().toLowerCase(), formData.password);
      navigate(redirectPath, { replace: true });
    } catch (error) {
      setGeneralError(getApiErrorMessage(error, 'Đăng ký thất bại'));
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
          <h1>Tạo tài khoản</h1>
          <p>Đăng ký để đồng bộ giỏ hàng, địa chỉ giao hàng và lịch sử đơn mua.</p>
        </header>

        {generalError ? (
          <Message variant="error" onClose={() => setGeneralError('')}>
            {generalError}
          </Message>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Họ và tên
            </label>
            <div className="auth-input-wrap">
              <FiUser />
              <input
                id="name"
                className="form-input"
                type="text"
                autoComplete="name"
                value={formData.name}
                onChange={(event) => handleFieldChange('name', event.target.value)}
                placeholder="Nguyen Van A"
              />
            </div>
            {fieldErrors.name ? <small className="text-danger">{fieldErrors.name}</small> : null}
          </div>

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
                autoComplete="new-password"
                value={formData.password}
                onChange={(event) => handleFieldChange('password', event.target.value)}
                placeholder="Tối thiểu 6 ký tự"
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

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">
              Xác nhận mật khẩu
            </label>
            <div className="auth-input-wrap">
              <FiLock />
              <input
                id="confirmPassword"
                className="form-input"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={(event) => handleFieldChange('confirmPassword', event.target.value)}
                placeholder="Nhập lại mật khẩu"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowConfirmPassword((previous) => !previous)}
                aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {fieldErrors.confirmPassword ? (
              <small className="text-danger">{fieldErrors.confirmPassword}</small>
            ) : null}
          </div>

          <button className="btn btn-primary auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}
          </button>
        </form>

        <footer className="auth-footer">
          <span>Đã có tài khoản?</span>
          <Link to="/login">Đăng nhập</Link>
        </footer>
      </div>
    </section>
  );
};

export default RegisterPage;
