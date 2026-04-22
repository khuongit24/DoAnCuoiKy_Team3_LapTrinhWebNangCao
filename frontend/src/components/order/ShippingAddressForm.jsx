import './ShippingAddressForm.css';

const NEW_ADDRESS_KEY = '__new__';

const formatAddressPreview = (address) => {
  if (!address) {
    return '';
  }

  return [address.address, address.city, address.province].filter(Boolean).join(', ');
};

const ShippingAddressForm = ({
  savedAddresses = [],
  selectedAddressId = NEW_ADDRESS_KEY,
  onSelectAddress,
  formData,
  onFormChange,
  saveAddress,
  onSaveAddressChange,
  errors = {},
}) => {
  const hasSavedAddresses = Array.isArray(savedAddresses) && savedAddresses.length > 0;
  const showAddressFields = selectedAddressId === NEW_ADDRESS_KEY || !hasSavedAddresses;

  return (
    <div className="shipping-address-form">
      {hasSavedAddresses ? (
        <fieldset className="shipping-address-form__saved surface">
          <legend>Địa chỉ đã lưu</legend>

          <div className="shipping-address-form__saved-list">
            {savedAddresses.map((address, index) => {
              const addressId = String(address?._id || '');
              const checked = selectedAddressId === addressId;

              return (
                <label key={addressId || `address-${index}`} className={`shipping-address-form__saved-item ${checked ? 'is-active' : ''}`}>
                  <input
                    type="radio"
                    name="shippingAddressChoice"
                    value={addressId}
                    checked={checked}
                    onChange={() => onSelectAddress(addressId)}
                  />
                  <div>
                    <strong>
                      {address.fullName || 'Người nhận'} {address.isDefault ? '(Mặc định)' : ''}
                    </strong>
                    <p>{address.phone || 'Chưa có số điện thoại'}</p>
                    <p>{formatAddressPreview(address)}</p>
                  </div>
                </label>
              );
            })}

            <label className={`shipping-address-form__saved-item ${selectedAddressId === NEW_ADDRESS_KEY ? 'is-active' : ''}`}>
              <input
                type="radio"
                name="shippingAddressChoice"
                value={NEW_ADDRESS_KEY}
                checked={selectedAddressId === NEW_ADDRESS_KEY}
                onChange={() => onSelectAddress(NEW_ADDRESS_KEY)}
              />
              <div>
                <strong>Nhập địa chỉ mới</strong>
                <p>Nhập thông tin giao hàng khác với các địa chỉ đã lưu.</p>
              </div>
            </label>
          </div>
        </fieldset>
      ) : null}

      {showAddressFields ? (
        <div className="shipping-address-form__fields">
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="shipping-full-name">
                Họ và tên người nhận
              </label>
              <input
                id="shipping-full-name"
                className="form-input"
                type="text"
                value={formData.fullName}
                onChange={(event) => onFormChange('fullName', event.target.value)}
                placeholder="Nguyễn Văn A"
              />
              {errors.fullName ? <small className="text-danger">{errors.fullName}</small> : null}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="shipping-phone">
                Số điện thoại
              </label>
              <input
                id="shipping-phone"
                className="form-input"
                type="tel"
                value={formData.phone}
                onChange={(event) => onFormChange('phone', event.target.value)}
                placeholder="09xxxxxxxx"
              />
              {errors.phone ? <small className="text-danger">{errors.phone}</small> : null}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="shipping-address">
              Địa chỉ chi tiết
            </label>
            <input
              id="shipping-address"
              className="form-input"
              type="text"
              value={formData.address}
              onChange={(event) => onFormChange('address', event.target.value)}
              placeholder="Số nhà, tên đường"
            />
            {errors.address ? <small className="text-danger">{errors.address}</small> : null}
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="shipping-city">
                Quận/Huyện
              </label>
              <input
                id="shipping-city"
                className="form-input"
                type="text"
                value={formData.city}
                onChange={(event) => onFormChange('city', event.target.value)}
                placeholder="Quận 1"
              />
              {errors.city ? <small className="text-danger">{errors.city}</small> : null}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="shipping-province">
                Tỉnh/Thành phố
              </label>
              <input
                id="shipping-province"
                className="form-input"
                type="text"
                value={formData.province}
                onChange={(event) => onFormChange('province', event.target.value)}
                placeholder="TP Hồ Chí Minh"
              />
              {errors.province ? <small className="text-danger">{errors.province}</small> : null}
            </div>
          </div>

          <label className="shipping-address-form__checkbox">
            <input
              type="checkbox"
              checked={Boolean(saveAddress)}
              onChange={(event) => onSaveAddressChange(event.target.checked)}
            />
            <span>Lưu địa chỉ này vào hồ sơ của tôi</span>
          </label>
        </div>
      ) : null}
    </div>
  );
};

ShippingAddressForm.NEW_ADDRESS_KEY = NEW_ADDRESS_KEY;

export default ShippingAddressForm;
