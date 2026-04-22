import { Link } from 'react-router-dom';

import './AboutPage.css';

const CORE_VALUES = [
  {
    title: 'Hàng chính hãng',
    description: 'TechShop chỉ phân phối sản phẩm có nguồn gốc rõ ràng, đầy đủ chính sách bảo hành.',
  },
  {
    title: 'Tư vấn minh bạch',
    description: 'Đội ngũ tư vấn giải thích rõ cấu hình, nhu cầu và chi phí để bạn chọn đúng sản phẩm.',
  },
  {
    title: 'Giao nhanh toàn quốc',
    description: 'Đơn hàng được xử lý sớm, theo dõi trạng thái trực quan và hỗ trợ khi phát sinh.',
  },
  {
    title: 'Hỗ trợ sau bán',
    description: 'Theo sát trải nghiệm khách hàng trong suốt quá trình sử dụng sản phẩm.',
  },
];

const MILESTONES = [
  {
    year: '2023',
    content: 'Khởi động TechShop với mục tiêu tập trung vào linh kiện và gaming gear chính hãng.',
  },
  {
    year: '2024',
    content: 'Mở rộng danh mục laptop, PC build sẵn và dịch vụ tư vấn cấu hình theo nhu cầu.',
  },
  {
    year: '2025',
    content: 'Chuẩn hóa quy trình vận hành, bảo hành và chăm sóc khách hàng toàn quốc.',
  },
  {
    year: '2026',
    content: 'Nâng cấp trải nghiệm mua sắm trực tuyến với hệ thống quản trị và theo dõi đơn hàng minh bạch.',
  },
];

const AboutPage = () => {
  return (
    <article className="about-page">
      <div className="container">
        <header className="about-page__hero surface">
          <p className="about-page__eyebrow">Về chúng tôi</p>
          <h1>TechShop - Đồng hành cùng mọi cấu hình bạn muốn xây dựng</h1>
          <p>
            Chúng tôi xây dựng TechShop để giúp người dùng Việt Nam mua thiết bị công nghệ đúng nhu cầu,
            đúng ngân sách và yên tâm về chất lượng.
          </p>
        </header>

        <section className="about-page__section surface">
          <h2>Sứ mệnh</h2>
          <p>
            Mang sản phẩm công nghệ chính hãng đến gần hơn với cộng đồng học tập, làm việc và giải trí,
            đồng thời giữ trải nghiệm mua sắm rõ ràng từ tư vấn đến hậu mãi.
          </p>
        </section>

        <section className="about-page__section about-page__section--values">
          <h2>Giá trị cốt lõi</h2>
          <div className="about-page__values-grid">
            {CORE_VALUES.map((value) => (
              <article key={value.title} className="surface about-page__value-card">
                <h3>{value.title}</h3>
                <p>{value.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-page__section about-page__timeline surface">
          <h2>Các cột mốc phát triển</h2>
          <ul>
            {MILESTONES.map((item) => (
              <li key={item.year}>
                <strong>{item.year}</strong>
                <p>{item.content}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="about-page__section about-page__cta surface">
          <h2>Bạn cần tư vấn cấu hình?</h2>
          <p>
            Đội ngũ TechShop luôn sẵn sàng hỗ trợ bạn chọn đúng thiết bị theo mục tiêu sử dụng thực tế.
          </p>
          <Link to="/contact" className="btn btn-primary">
            Liên hệ tư vấn
          </Link>
        </section>
      </div>
    </article>
  );
};

export default AboutPage;
