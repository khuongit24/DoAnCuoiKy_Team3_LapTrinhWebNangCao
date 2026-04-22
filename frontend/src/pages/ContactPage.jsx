import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiClock, FiMail, FiMapPin, FiPhone } from 'react-icons/fi';

import './ContactPage.css';

const INITIAL_FORM = {
  name: '',
  email: '',
  subject: '',
  message: '',
};

const EMAIL_REGEX = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

const ContactPage = () => {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const isFormValid = useMemo(() => {
    return (
      formData.name.trim().length > 0
      && EMAIL_REGEX.test(formData.email.trim())
      && formData.message.trim().length >= 10
    );
  }, [formData]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isFormValid) {
      toast.error('Vui lòng nhập đầy đủ thông tin hợp lệ trước khi gửi.');
      return;
    }

    setSubmitting(true);

    try {
      await new Promise((resolve) => {
        setTimeout(resolve, 500);
      });

      setFormData(INITIAL_FORM);
      toast.success('Yêu cầu liên hệ đã được ghi nhận. TechShop sẽ phản hồi trong 24 giờ làm việc.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article className="contact-page">
      <div className="container contact-page__layout">
        <section className="contact-page__info surface">
          <p className="contact-page__eyebrow">Liên hệ</p>
          <h1>Kết nối với đội ngũ TechShop</h1>
          <p>
            Bạn cần tư vấn cấu hình, hỗ trợ đơn hàng hoặc chính sách bảo hành? Hãy để lại thông tin,
            chúng tôi sẽ phản hồi sớm nhất.
          </p>

          <ul className="contact-page__details">
            <li>
              <FiPhone />
              <span>
                <strong>Hotline</strong>
                <a href="tel:19006688">1900 6688</a>
              </span>
            </li>
            <li>
              <FiMail />
              <span>
                <strong>Email</strong>
                <a href="mailto:support@techshop.vn">support@techshop.vn</a>
              </span>
            </li>
            <li>
              <FiMapPin />
              <span>
                <strong>Địa chỉ</strong>
                <p>227 Nguyễn Văn Cừ, Quận 5, TP.HCM</p>
              </span>
            </li>
            <li>
              <FiClock />
              <span>
                <strong>Giờ hỗ trợ</strong>
                <p>08:00 - 21:00 (Thứ 2 đến Chủ nhật)</p>
              </span>
            </li>
          </ul>

          <div className="contact-page__map-wrapper">
            <iframe
              title="Bản đồ vị trí TechShop"
              loading="lazy"
              src="https://www.openstreetmap.org/export/embed.html?bbox=106.6799%2C10.7571%2C106.6869%2C10.7647&layer=mapnik&marker=10.7609%2C106.6834"
            />
          </div>
        </section>

        <section className="contact-page__form-card surface">
          <h2>Gửi yêu cầu tư vấn</h2>

          <form className="contact-page__form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="name">Họ và tên</label>
              <input
                id="name"
                name="name"
                type="text"
                className="form-input"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-input"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="subject">Chủ đề</label>
              <input
                id="subject"
                name="subject"
                type="text"
                className="form-input"
                value={formData.subject}
                onChange={handleInputChange}
                placeholder="Ví dụ: Tư vấn build PC gaming"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="message">Nội dung</label>
              <textarea
                id="message"
                name="message"
                className="form-textarea"
                rows={6}
                minLength={10}
                value={formData.message}
                onChange={handleInputChange}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu'}
            </button>
          </form>
        </section>
      </div>
    </article>
  );
};

export default ContactPage;
