import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import Loader from './Loader';

const ProtectedRoute = ({ adminOnly = false, children }) => {
  const location = useLocation();
  const {
    loading,
    isAuthenticated,
    user,
    adminLoading,
    isAdminSessionAuthenticated,
    hasAdminPanelPermission,
  } = useAuth();

  if (adminOnly) {
    if (loading || adminLoading) {
      return <Loader fullPage text="Đang xác thực phiên quản trị..." />;
    }

    const normalizedUserRole = String(user?.role || '').trim().toLowerCase();

    if (!isAdminSessionAuthenticated) {
      if (isAuthenticated && normalizedUserRole === 'user') {
        return (
          <Navigate
            to="/admin/login"
            state={{
              from: location,
              reason: 'insufficient_role',
            }}
            replace
          />
        );
      }

      return (
        <Navigate
          to="/admin/login"
          state={{
            from: location,
            reason: 'admin_auth_required',
          }}
          replace
        />
      );
    }

    if (!hasAdminPanelPermission) {
      return (
        <Navigate
          to="/admin/login"
          state={{
            from: location,
            reason: 'missing_panel_permission',
          }}
          replace
        />
      );
    }

    return children || <Outlet />;
  }

  if (loading) {
    return <Loader fullPage text="Đang xác thực phiên đăng nhập..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children || <Outlet />;
};

export default ProtectedRoute;
