import EmptyState from '../components/common/EmptyState';

const PlaceholderPage = ({ title, description }) => {
  return (
    <section className="container" style={{ display: 'grid', gap: '16px' }}>
      <h1 style={{ fontSize: 'var(--font-size-3xl)' }}>{title}</h1>
      <EmptyState title={title} description={description} />
    </section>
  );
};

export default PlaceholderPage;
