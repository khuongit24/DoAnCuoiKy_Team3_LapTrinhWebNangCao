import { useEffect, useRef, useState } from 'react';
import { FiChevronDown, FiGrid, FiLogOut, FiMenu, FiPackage, FiShoppingCart, FiUser, FiX } from 'react-icons/fi';
import { Link, NavLink, useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { CATEGORIES } from '../../utils/constants';
import SearchBar from './SearchBar';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { itemsCount } = useCart();
  const headerRef = useRef(null);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const displayedName = user?.name ? user.name.trim().split(' ')[0] || user.name : 'Tài khoản';

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
    setMobileOpen(false);
    navigate('/');
  };

  const closeAllMenus = () => {
    setCategoryOpen(false);
    setUserMenuOpen(false);
    setMobileOpen(false);
  };

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setCategoryOpen(false);
        setUserMenuOpen(false);
        setMobileOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, []);

  const navClassName = ({ isActive }) => (isActive ? 'site-header__link site-header__link--active' : 'site-header__link');

  return (
    <header className="site-header" ref={headerRef}>
      <div className="site-header__inner container">
        <Link to="/" className="site-header__brand" onClick={closeAllMenus}>
          <span className="site-header__brand-mark">TS</span>
          <span>
            TechShop
            <small>Thiết bị chất lượng cho dân công nghệ</small>
          </span>
        </Link>

        <nav className="site-header__nav site-header__nav--desktop" aria-label="Điều hướng chính">
          <NavLink to="/" className={navClassName} onClick={closeAllMenus}>
            Trang chủ
          </NavLink>
          <NavLink to="/products" className={navClassName} onClick={closeAllMenus}>
            Sản phẩm
          </NavLink>

          <div className="site-header__dropdown">
            <button
              type="button"
              className="site-header__link"
              onClick={() => setCategoryOpen((previous) => !previous)}
              aria-expanded={categoryOpen}
            >
              Danh mục <FiChevronDown />
            </button>
            {categoryOpen && (
              <div className="site-header__dropdown-menu">
                {CATEGORIES.map((category) => (
                  <Link
                    key={category}
                    to={`/products?category=${encodeURIComponent(category)}`}
                    onClick={closeAllMenus}
                  >
                    {category}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="site-header__search site-header__search--desktop">
          <SearchBar />
        </div>

        <div className="site-header__actions">
          <Link to="/cart" className="site-header__action" aria-label="Mở giỏ hàng" onClick={closeAllMenus}>
            <FiShoppingCart />
            <span>Giỏ hàng</span>
            <strong className="site-header__badge">{itemsCount}</strong>
          </Link>

          {!isAuthenticated && (
            <div className="site-header__auth-links">
              <Link to="/login" className="btn btn-outline" onClick={closeAllMenus}>
                Đăng nhập
              </Link>
              <Link to="/register" className="btn btn-primary" onClick={closeAllMenus}>
                Đăng ký
              </Link>
            </div>
          )}

          {isAuthenticated && (
            <div className="site-header__dropdown site-header__user-dropdown">
              <button
                type="button"
                className="site-header__action site-header__action--user"
                onClick={() => setUserMenuOpen((previous) => !previous)}
                aria-expanded={userMenuOpen}
              >
                <FiUser />
                <span>{displayedName}</span>
                <FiChevronDown />
              </button>

              {userMenuOpen && (
                <div className="site-header__dropdown-menu site-header__dropdown-menu--right">
                  <Link to="/profile" onClick={closeAllMenus}>
                    <FiUser />
                    Hồ sơ
                  </Link>
                  <Link to="/orders" onClick={closeAllMenus}>
                    <FiPackage />
                    Đơn hàng
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={closeAllMenus}>
                      <FiGrid />
                      Bảng điều khiển
                    </Link>
                  )}
                  <button type="button" onClick={handleLogout}>
                    <FiLogOut />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            className="site-header__hamburger"
            onClick={() => setMobileOpen((previous) => !previous)}
            aria-label="Mở menu mobile"
          >
            {mobileOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="site-header__mobile-panel">
          <div className="container">
            <div className="site-header__search">
              <SearchBar />
            </div>

            <nav className="site-header__nav site-header__nav--mobile" aria-label="Điều hướng mobile">
              <NavLink to="/" className={navClassName} onClick={closeAllMenus}>
                Trang chủ
              </NavLink>
              <NavLink to="/products" className={navClassName} onClick={closeAllMenus}>
                Sản phẩm
              </NavLink>
              <div className="site-header__category-list">
                {CATEGORIES.map((category) => (
                  <Link
                    key={category}
                    to={`/products?category=${encodeURIComponent(category)}`}
                    onClick={closeAllMenus}
                  >
                    {category}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
