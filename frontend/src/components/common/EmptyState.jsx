import { FiInbox } from 'react-icons/fi';

const EmptyState = ({
  icon,
  title = 'Chưa có dữ liệu',
  description = 'Không tìm thấy dữ liệu phù hợp với bộ lọc hiện tại.',
  action,
}) => {
  return (
    <section className="surface" style={{ padding: '32px', textAlign: 'center' }}>
      <div style={{ display: 'grid', gap: '12px', justifyItems: 'center' }}>
        <span
          style={{
            width: 56,
            height: 56,
            borderRadius: 999,
            display: 'grid',
            placeItems: 'center',
            background: 'var(--color-primary-50)',
            color: 'var(--color-primary-600)',
          }}
        >
          {icon || <FiInbox />}
        </span>
        <h2 style={{ fontSize: 'var(--font-size-xl)' }}>{title}</h2>
        <p style={{ maxWidth: 520 }}>{description}</p>
        {action ? <div style={{ marginTop: 8 }}>{action}</div> : null}
      </div>
    </section>
  );
};

export default EmptyState;
