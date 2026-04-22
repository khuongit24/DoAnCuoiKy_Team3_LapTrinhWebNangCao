import { useMemo, useState } from 'react';
import { FiEye, FiEyeOff, FiLock, FiMail, FiShield } from 'react-icons/fi';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import Message from '../../components/common/Message';
import { useAuth } from '../../hooks/useAuth';
import { getApiErrorMessageWithRequestId, getFieldErrors } from '../../utils/errorUtils';
import '../LoginPage.css';
import './AdminLoginPage.css';

const EMAIL_REGEX = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

const getReasonMessage = (reason) => {
  const normalizedReason = String(reason || '').trim();

  if (normalizedReason === 'insufficient_role') {
    return 'Tài khoản của bạn không có quyền truy cập khu vực quản trị.';
  }

  if (normalizedReason === 'missing_panel_permission') {
    return 'Phiên quản trị không có quyền truy cập bảng điều khiển. Vui lòng đăng nhập lại.';
  }

  if (normalizedReason === 'admin_auth_required') {
    return 'Vui lòng đăng nhập quản trị để tiếp tục.';
  }

  return '';
};

const resolveAdminRedirectPath = (locationState) => {
  const fromPath = String(locationState?.from?.pathname || '').trim();

  if (fromPath.startsWith('/admin') && fromPath !== '/admin/login') {
    return fromPath;
  }

  return '/admin/dashboard';
};

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { adminLogin, adminLoading, isAdminSessionAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const redirectPath = useMemo(() => resolveAdminRedirectPath(location.state), [location.state]);
  const reasonMessage = useMemo(() => getReasonMessage(location.state?.reason), [location.state]);

  if (isAdminSessionAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }

  const handleFieldChange = (fieldName, value) => {
    setFormData((previousData) => ({
      ...previousData,
      [fieldName]: value,
    }));

    setFieldErrors((previousErrors) => {
      if (!previousErrors[fieldName]) {
        return previousErrors;
      }

      const nextErrors = {
        ...previousErrors,
      };

      delete nextErrors[fieldName];
      return nextErrors;
    });
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.email.trim()) {
      nextErrors.email = 'Vui lòng nhập email quản trị';
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
      await adminLogin(formData.email.trim().toLowerCase(), formData.password);
      navigate(redirectPath, { replace: true });
    } catch (error) {
      setGeneralError(getApiErrorMessageWithRequestId(error, 'Đăng nhập quản trị thất bại'));
      setFieldErrors((previousErrors) => ({
        ...previousErrors,
        ...getFieldErrors(error),
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const disableSubmit = submitting || adminLoading;

  return (
    <section className="auth-page container admin-login-page">
      <div className="auth-card surface">
        <header>
          <h1 className="admin-login-page__title">
            <FiShield aria-hidden="true" />
            Đăng nhập quản trị
          </h1>
          <p>Chỉ tài khoản quản trị có quyền truy cập bảng điều khiển admin.</p>
        </header>

        {reasonMessage ? <Message variant="warning">{reasonMessage}</Message> : null}

        {generalError ? (
          <Message variant="error" onClose={() => setGeneralError('')}>
            {generalError}
          </Message>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="admin-email">
              Email quản trị
            </label>
            <div className="auth-input-wrap">
              <FiMail />
              <input
                id="admin-email"
                className="form-input"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={(event) => handleFieldChange('email', event.target.value)}
                placeholder="admin@example.com"
                disabled={disableSubmit}
              />
            </div>
            {fieldErrors.email ? <small className="text-danger">{fieldErrors.email}</small> : null}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="admin-password">
              Mật khẩu
            </label>
            <div className="auth-input-wrap">
              <FiLock />
              <input
                id="admin-password"
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={formData.password}
                onChange={(event) => handleFieldChange('password', event.target.value)}
                placeholder="Nhập mật khẩu quản trị"
                disabled={disableSubmit}
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((previousValue) => !previousValue)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                disabled={disableSubmit}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {fieldErrors.password ? <small className="text-danger">{fieldErrors.password}</small> : null}
          </div>

          <button className="btn btn-primary auth-submit" type="submit" disabled={disableSubmit}>
            {disableSubmit ? 'Đang xác thực...' : 'Đăng nhập quản trị'}
          </button>
        </form>
      </div>
    </section>
  );
};

export default AdminLoginPage;
