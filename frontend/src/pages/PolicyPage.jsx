import { Link } from 'react-router-dom';

import './PolicyPage.css';

const POLICY_SECTIONS = [
  {
    title: '1. Chính sách đổi trả',
    content:
      'Khách hàng có thể yêu cầu đổi trả trong vòng 14 ngày kể từ ngày nhận hàng với điều kiện sản phẩm còn nguyên trạng và đầy đủ phụ kiện đi kèm.',
  },
  {
    title: '2. Chính sách bảo hành',
    content:
      'Toàn bộ sản phẩm chính hãng được bảo hành theo thời hạn của nhà sản xuất. TechShop hỗ trợ tiếp nhận và theo dõi tiến trình bảo hành cho khách hàng.',
  },
  {
    title: '3. Chính sách vận chuyển',
    content:
      'Miễn phí vận chuyển cho đơn hàng từ 2.000.000 VND. Các đơn dưới mức này áp dụng phí vận chuyển cố định theo cấu hình tại hệ thống.',
  },
  {
    title: '4. Chính sách thanh toán',
    content:
      'Hỗ trợ thanh toán COD, chuyển khoản và Stripe. Với thanh toán trực tuyến, đơn hàng được xử lý ngay sau khi hệ thống xác nhận giao dịch.',
  },
  {
    title: '5. Chính sách bảo mật thông tin',
    content:
      'Thông tin cá nhân của khách hàng chỉ được sử dụng cho mục đích xử lý đơn hàng, chăm sóc khách hàng và không chia sẻ cho bên thứ ba trái phép.',
  },
];

const PolicyPage = () => {
  return (
    <article className="policy-page">
      <div className="container">
        <header className="policy-page__hero surface">
          <p className="policy-page__eyebrow">Chính sách</p>
          <h1>Chính sách mua hàng tại TechShop</h1>
          <p>
            Bộ chính sách dưới đây giúp khách hàng nắm rõ quyền lợi, trách nhiệm và quy trình hỗ trợ trong suốt
            quá trình mua sắm.
          </p>
        </header>

        <section className="policy-page__list">
          {POLICY_SECTIONS.map((section) => (
            <article key={section.title} className="policy-page__card surface">
              <h2>{section.title}</h2>
              <p>{section.content}</p>
            </article>
          ))}
        </section>

        <section className="policy-page__footer surface">
          <h2>Cần giải đáp thêm?</h2>
          <p>Nếu cần hỗ trợ cụ thể cho đơn hàng, vui lòng liên hệ đội ngũ chăm sóc khách hàng của TechShop.</p>
          <Link to="/contact" className="btn btn-primary">
            Đến trang liên hệ
          </Link>
        </section>
      </div>
    </article>
  );
};

export default PolicyPage;
