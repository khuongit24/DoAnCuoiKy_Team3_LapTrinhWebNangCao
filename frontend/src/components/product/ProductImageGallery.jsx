import { useMemo, useState } from 'react';

import './ProductImageGallery.css';

const FALLBACK_IMAGE = 'https://placehold.co/900x900?text=TechShop';

const normalizeImages = (images) => {
  if (!Array.isArray(images)) {
    return [FALLBACK_IMAGE];
  }

  const validImages = images.map((item) => String(item || '').trim()).filter(Boolean);
  return validImages.length > 0 ? validImages : [FALLBACK_IMAGE];
};

const ProductImageGallery = ({ images = [], productName = 'Sản phẩm' }) => {
  const safeImages = useMemo(() => normalizeImages(images), [images]);
  const [activeImageUrl, setActiveImageUrl] = useState('');

  const activeImage = safeImages.includes(activeImageUrl)
    ? activeImageUrl
    : safeImages[0] || FALLBACK_IMAGE;

  return (
    <div className="product-gallery">
      <div className="product-gallery__main">
        <img src={activeImage} alt={productName} />
      </div>

      <div className="product-gallery__thumbs" role="tablist" aria-label="Thư viện ảnh sản phẩm">
        {safeImages.map((image, index) => {
          const isActive = image === activeImage;

          return (
            <button
              key={`${image}-${index}`}
              type="button"
              className={`product-gallery__thumb ${isActive ? 'product-gallery__thumb--active' : ''}`}
              onClick={() => setActiveImageUrl(image)}
              role="tab"
              aria-selected={isActive}
            >
              <img src={image} alt={`${productName} ${index + 1}`} loading="lazy" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProductImageGallery;