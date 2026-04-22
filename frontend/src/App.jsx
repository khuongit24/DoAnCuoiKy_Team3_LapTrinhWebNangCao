import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import Footer from './components/common/Footer';
import Header from './components/common/Header';
import ProtectedRoute from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import ScrollToTop from './components/common/ScrollToTop';
import AdminLayout from './components/admin/AdminLayout';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AuditLogManage from './pages/admin/AuditLogManage';
import AboutPage from './pages/AboutPage';
import OrderManage from './pages/admin/OrderManage';
import ProductManage from './pages/admin/ProductManage';
import UserManage from './pages/admin/UserManage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import ContactPage from './pages/ContactPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import OrderDetailPage from './pages/OrderDetailPage';
import OrderPage from './pages/OrderPage';
import PolicyPage from './pages/PolicyPage';
import ProfilePage from './pages/ProfilePage';
import ProductListPage from './pages/ProductListPage';
import ProductPage from './pages/ProductPage';
import RegisterPage from './pages/RegisterPage';

const getPageTitleByPathname = (pathname) => {
  const normalizedPath = String(pathname || '/').replace(/\/+$/, '') || '/';

  if (normalizedPath === '/') {
    return 'TechShop | Trang chủ';
  }

  if (normalizedPath === '/products') {
    return 'TechShop | Sản phẩm';
  }

  if (/^\/products\/[^/]+$/.test(normalizedPath)) {
    return 'TechShop | Chi tiết sản phẩm';
  }

  if (normalizedPath === '/cart') {
    return 'TechShop | Giỏ hàng';
  }

  if (normalizedPath === '/login') {
    return 'TechShop | Đăng nhập';
  }

  if (normalizedPath === '/admin/login') {
    return 'TechShop | Đăng nhập quản trị';
  }

  if (normalizedPath === '/register') {
    return 'TechShop | Đăng ký';
  }

  if (normalizedPath === '/profile') {
    return 'TechShop | Tài khoản';
  }

  if (normalizedPath === '/orders') {
    return 'TechShop | Đơn hàng của tôi';
  }

  if (/^\/orders\/[^/]+$/.test(normalizedPath)) {
    return 'TechShop | Chi tiết đơn hàng';
  }

  if (normalizedPath === '/checkout') {
    return 'TechShop | Thanh toán';
  }

  if (normalizedPath === '/admin' || normalizedPath === '/admin/dashboard') {
    return 'TechShop | Bảng điều khiển admin';
  }

  if (normalizedPath === '/admin/products') {
    return 'TechShop | Quản trị sản phẩm';
  }

  if (normalizedPath === '/admin/orders') {
    return 'TechShop | Quản trị đơn hàng';
  }

  if (normalizedPath === '/admin/users') {
    return 'TechShop | Quản trị người dùng';
  }

  if (normalizedPath === '/admin/audit-logs') {
    return 'TechShop | Nhật ký kiểm toán';
  }

  if (normalizedPath === '/about') {
    return 'TechShop | Giới thiệu';
  }

  if (normalizedPath === '/policy') {
    return 'TechShop | Chính sách';
  }

  if (normalizedPath === '/contact') {
    return 'TechShop | Liên hệ';
  }

  return 'TechShop | Không tìm thấy trang';
};

const RouteTitleManager = () => {
  const location = useLocation();

  useEffect(() => {
    document.title = getPageTitleByPathname(location.pathname);
  }, [location.pathname]);

  return null;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/products" element={<ProductListPage />} />
      <Route path="/products/:slug" element={<ProductPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/orders" element={<OrderPage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
      </Route>

      <Route element={<ProtectedRoute adminOnly />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="products" element={<ProductManage />} />
          <Route path="orders" element={<OrderManage />} />
          <Route path="users" element={<UserManage />} />
          <Route path="audit-logs" element={<AuditLogManage />} />
        </Route>
      </Route>

      <Route path="/about" element={<AboutPage />} />
      <Route path="/policy" element={<PolicyPage />} />
      <Route path="/contact" element={<ContactPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <RouteTitleManager />
        <ScrollToTop />

        <div className="app-shell">
          <Header />
          <main className="main-content">
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </main>
          <Footer />
        </div>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              borderRadius: '10px',
              fontSize: '14px',
            },
          }}
        />
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
