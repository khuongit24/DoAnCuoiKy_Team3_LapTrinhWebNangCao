import { FiMail, FiMapPin, FiPhone } from 'react-icons/fi';
import { Link } from 'react-router-dom';

import './Footer.css';

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div>
          <h3>TechShop</h3>
          <p>
            Nơi quy tụ linh kiện, gaming gear và thiết bị công nghệ chính hãng cho game thủ và
            developer.
          </p>
        </div>

        <div>
          <h4>Liên kết nhanh</h4>
          <ul>
            <li>
              <Link to="/about">Giới thiệu</Link>
            </li>
            <li>
              <Link to="/policy">Chính sách</Link>
            </li>
            <li>
              <Link to="/contact">Liên hệ</Link>
            </li>
          </ul>
        </div>

        <div>
          <h4>Thông tin liên hệ</h4>
          <ul>
            <li>
              <FiMail /> support@techshop.vn
            </li>
            <li>
              <FiPhone /> 1900 6688
            </li>
            <li>
              <FiMapPin /> 227 Nguyễn Văn Cừ, Q5, TP.HCM
            </li>
          </ul>
        </div>
      </div>

      <div className="site-footer__bottom">
        <p>Bản quyền © {new Date().getFullYear()} TechShop. Bảo lưu mọi quyền.</p>
      </div>
    </footer>
  );
};

export default Footer;
