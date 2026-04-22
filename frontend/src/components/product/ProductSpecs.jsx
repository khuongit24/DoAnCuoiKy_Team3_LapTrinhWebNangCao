const normalizeSpecs = (specs) => {
  if (Array.isArray(specs)) {
    return specs
      .map((item) => ({
        key: String(item?.key || '').trim(),
        value: String(item?.value || '').trim(),
      }))
      .filter((item) => item.key && item.value);
  }

  if (specs && typeof specs === 'object') {
    return Object.entries(specs)
      .map(([key, value]) => ({ key: String(key || '').trim(), value: String(value || '').trim() }))
      .filter((item) => item.key && item.value);
  }

  return [];
};

const ProductSpecs = ({ specs }) => {
  const normalizedSpecs = normalizeSpecs(specs);

  if (normalizedSpecs.length === 0) {
    return <p className="product-specs__empty">Sản phẩm này chưa có thông số kỹ thuật chi tiết.</p>;
  }

  return (
    <div className="product-specs">
      <table className="product-specs__table">
        <tbody>
          {normalizedSpecs.map((item, index) => (
            <tr key={`${item.key}-${index}`}>
              <th scope="row">{item.key}</th>
              <td>{item.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductSpecs;