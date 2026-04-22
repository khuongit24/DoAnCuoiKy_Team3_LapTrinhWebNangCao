import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import AdminSidebar from './AdminSidebar';
import './AdminLayout.css';

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen((previous) => !previous);
  };

  return (
    <div className="admin-layout" aria-label="Bố cục quản trị">
      <AdminSidebar isOpen={isSidebarOpen} onClose={handleCloseSidebar} onToggle={handleToggleSidebar} />

      {isSidebarOpen && (
        <button
          type="button"
          className="admin-layout__overlay"
          onClick={handleCloseSidebar}
          aria-label="Đóng lớp phủ menu admin"
        />
      )}

      <section className="admin-layout__content" aria-label="Nội dung trang admin">
        <Outlet />
      </section>
    </div>
  );
};

export default AdminLayout;
