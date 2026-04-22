import { Link, NavLink } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { ADMIN_NAV_ITEMS } from '../../utils/constants';
import './AdminSidebar.css';

const AdminSidebar = ({ isOpen, onClose, onToggle }) => {
  const { adminUser, adminLoading, adminLogout, adminLogoutAll } = useAuth();

  const navClassName = ({ isActive }) =>
    isActive ? 'admin-sidebar__nav-link admin-sidebar__nav-link--active' : 'admin-sidebar__nav-link';

  const handleNavClick = () => {
    if (isOpen) {
      onClose();
    }
  };

  const handleLogoutCurrentSession = async () => {
    await adminLogout();
    handleNavClick();
  };

  const handleLogoutAllSessions = async () => {
    try {
      await adminLogoutAll();
      handleNavClick();
    } catch {
      // Toast lỗi đã được xử lý tại AuthContext.
    }
  };

  return (
    <>
      <button
        type="button"
        className="admin-sidebar__toggle"
        onClick={onToggle}
        aria-label={isOpen ? 'Đóng menu admin' : 'Mở menu admin'}
        aria-controls="admin-sidebar-navigation"
        aria-expanded={isOpen}
      >
        {isOpen ? 'Đóng menu' : 'Menu admin'}
      </button>

      <aside
        id="admin-sidebar-navigation"
        className={`admin-sidebar ${isOpen ? 'admin-sidebar--open' : ''}`}
        aria-label="Thanh điều hướng admin"
      >
        <div className="admin-sidebar__brand-row">
          <Link to="/admin/dashboard" className="admin-sidebar__brand" onClick={handleNavClick}>
            <span className="admin-sidebar__brand-mark">AP</span>
            <span>Bảng điều khiển</span>
          </Link>

          <button
            type="button"
            className="admin-sidebar__close"
            onClick={onClose}
            aria-label="Đóng menu điều hướng admin"
            aria-controls="admin-sidebar-navigation"
          >
            Đóng
          </button>
        </div>

        <nav className="admin-sidebar__nav" aria-label="Menu chức năng admin">
          {ADMIN_NAV_ITEMS.map((item) => (
            <NavLink key={item.path} to={item.path} className={navClassName} onClick={handleNavClick}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <section className="admin-sidebar__session" aria-label="Phiên đăng nhập quản trị">
          <p className="admin-sidebar__session-user">
            Đăng nhập với: <strong>{String(adminUser?.email || 'Quản trị viên')}</strong>
          </p>

          <button
            type="button"
            className="btn btn-outline admin-sidebar__session-btn"
            onClick={handleLogoutCurrentSession}
            disabled={adminLoading}
          >
            Đăng xuất phiên này
          </button>

          <button
            type="button"
            className="btn btn-outline admin-sidebar__session-btn admin-sidebar__session-btn--danger"
            onClick={handleLogoutAllSessions}
            disabled={adminLoading}
          >
            Đăng xuất tất cả phiên
          </button>
        </section>

        <Link to="/" className="admin-sidebar__home-link" onClick={handleNavClick}>
          Về trang chủ
        </Link>
      </aside>
    </>
  );
};

export default AdminSidebar;
