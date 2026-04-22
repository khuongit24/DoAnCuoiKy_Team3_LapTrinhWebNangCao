import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiArrowRight, FiCheckCircle, FiMapPin } from 'react-icons/fi';
import { Navigate, useNavigate } from 'react-router-dom';

import { createOrder } from '../api/orderApi';
import { getProfile, updateShippingAddress } from '../api/userApi';
import Message from '../components/common/Message';
import Loader from '../components/common/Loader';
import PaymentMethodSelect from '../components/order/PaymentMethodSelect';
import ShippingAddressForm from '../components/order/ShippingAddressForm';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { getApiErrorMessage, getFieldErrors } from '../utils/errorUtils';
import { PAYMENT_METHODS, SHIPPING_FREE_THRESHOLD } from '../utils/constants';
import { calculateCartTotals, formatPrice, getEffectivePrice } from '../utils/helpers';
import './CheckoutPage.css';

const PHONE_REGEX = /^(0[35789])[0-9]{8}$/;
const STEP_LABELS = ['Địa chỉ giao hàng', 'Phương thức thanh toán', 'Xác nhận đơn hàng'];
const NEW_ADDRESS_KEY = ShippingAddressForm.NEW_ADDRESS_KEY;
const VALID_PAYMENT_METHODS = new Set(PAYMENT_METHODS.map((item) => item.value));

const toShippingAddress = (value = {}) => ({
  fullName: String(value.fullName || '').trim(),
  phone: String(value.phone || '').trim(),
  address: String(value.address || '').trim(),
  city: String(value.city || '').trim(),
  province: String(value.province || '').trim(),
});

const extractDataObject = (response) => {
  if (response?.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
    return response.data;
  }

  if (response && typeof response === 'object' && !Array.isArray(response)) {
    return response;
  }

  return null;
};

const extractShippingAddresses = (response) => {
  if (Array.isArray(response?.data?.shippingAddresses)) {
    return response.data.shippingAddresses;
  }

  if (Array.isArray(response?.shippingAddresses)) {
    return response.shippingAddresses;
  }

  return [];
};

const findDefaultAddress = (addresses = []) => {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    return null;
  }

  return addresses.find((item) => item?.isDefault) || addresses[0];
};

const createInitialAddressForm = (user) => ({
  fullName: String(user?.name || '').trim(),
  phone: '',
  address: '',
  city: '',
  province: '',
});

const mapAddressFieldErrors = (fieldErrors) => {
  const mapped = {};

  Object.entries(fieldErrors).forEach(([fieldName, message]) => {
    const normalizedField = fieldName.startsWith('shippingAddress.')
      ? fieldName.replace('shippingAddress.', '')
      : fieldName;

    if (['fullName', 'phone', 'address', 'city', 'province'].includes(normalizedField)) {
      mapped[normalizedField] = message;
    }
  });

  return mapped;
};

const validateAddressPayload = (payload) => {
  const nextErrors = {};

  if (!payload.fullName) {
    nextErrors.fullName = 'Vui lòng nhập họ tên người nhận';
  }

  if (!payload.phone) {
    nextErrors.phone = 'Vui lòng nhập số điện thoại';
  } else if (!PHONE_REGEX.test(payload.phone)) {
    nextErrors.phone = 'Số điện thoại phải có dạng 0[35789]XXXXXXXX';
  }

  if (!payload.address) {
    nextErrors.address = 'Vui lòng nhập địa chỉ';
  }

  if (!payload.city) {
    nextErrors.city = 'Vui lòng nhập quận/huyện';
  }

  if (!payload.province) {
    nextErrors.province = 'Vui lòng nhập tỉnh/thành phố';
  }

  return nextErrors;
};

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { cartItems, clearCart } = useCart();

  const [activeStep, setActiveStep] = useState(1);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [error, setError] = useState('');

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(NEW_ADDRESS_KEY);
  const [addressForm, setAddressForm] = useState(() => createInitialAddressForm(user));
  const [addressErrors, setAddressErrors] = useState({});
  const [saveAddress, setSaveAddress] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [paymentError, setPaymentError] = useState('');

  const hasCartItems = Array.isArray(cartItems) && cartItems.length > 0;

  useEffect(() => {
    setAddressForm((previous) => {
      if (previous.fullName) {
        return previous;
      }

      return {
        ...previous,
        fullName: String(user?.name || '').trim(),
      };
    });
  }, [user?.name]);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      setLoadingProfile(true);

      try {
        const response = await getProfile();

        if (!isMounted) {
          return;
        }

        const profile = extractDataObject(response);
        const addresses = Array.isArray(profile?.shippingAddresses) ? profile.shippingAddresses : [];
        const defaultAddress = findDefaultAddress(addresses);

        setSavedAddresses(addresses);
        setSelectedAddressId(defaultAddress?._id ? String(defaultAddress._id) : NEW_ADDRESS_KEY);
      } catch {
        if (!isMounted) {
          return;
        }

        const fallbackAddresses = Array.isArray(user?.shippingAddresses) ? user.shippingAddresses : [];
        const defaultAddress = findDefaultAddress(fallbackAddresses);

        setSavedAddresses(fallbackAddresses);
        setSelectedAddressId(defaultAddress?._id ? String(defaultAddress._id) : NEW_ADDRESS_KEY);
      } finally {
        if (isMounted) {
          setLoadingProfile(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [user?._id, user?.shippingAddresses]);

  const selectedSavedAddress = useMemo(
    () => savedAddresses.find((item) => String(item?._id) === selectedAddressId) || null,
    [savedAddresses, selectedAddressId]
  );

  const currentShippingAddress = useMemo(() => {
    if (selectedSavedAddress) {
      return toShippingAddress(selectedSavedAddress);
    }

    return toShippingAddress(addressForm);
  }, [addressForm, selectedSavedAddress]);

  const totals = useMemo(() => calculateCartTotals(cartItems), [cartItems]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: { pathname: '/checkout' } }} replace />;
  }

  if (!hasCartItems) {
    return <Navigate to="/cart" replace />;
  }

  const validateAddressStep = () => {
    if (selectedSavedAddress) {
      setAddressErrors({});
      return true;
    }

    const nextErrors = validateAddressPayload(toShippingAddress(addressForm));
    setAddressErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validatePaymentStep = () => {
    if (VALID_PAYMENT_METHODS.has(paymentMethod)) {
      setPaymentError('');
      return true;
    }

    setPaymentError('Vui lòng chọn phương thức thanh toán hợp lệ');
    return false;
  };

  const handleAddressFieldChange = (fieldName, value) => {
    setAddressForm((previous) => ({
      ...previous,
      [fieldName]: value,
    }));

    setAddressErrors((previous) => {
      if (!previous[fieldName]) {
        return previous;
      }

      return {
        ...previous,
        [fieldName]: '',
      };
    });
  };

  const handleSelectAddress = (addressId) => {
    setSelectedAddressId(addressId || NEW_ADDRESS_KEY);
    if (addressId && addressId !== NEW_ADDRESS_KEY) {
      setSaveAddress(false);
    }
    setAddressErrors({});
  };

  const handleNextStep = () => {
    if (activeStep === 1 && !validateAddressStep()) {
      return;
    }

    if (activeStep === 2 && !validatePaymentStep()) {
      return;
    }

    setActiveStep((previous) => Math.min(3, previous + 1));
  };

  const handleBackStep = () => {
    setActiveStep((previous) => Math.max(1, previous - 1));
  };

  const handlePlaceOrder = async () => {
    if (!validateAddressStep()) {
      setActiveStep(1);
      return;
    }

    if (!validatePaymentStep()) {
      setActiveStep(2);
      return;
    }

    setLoadingOrder(true);
    setError('');

    try {
      const shippingAddressPayload = currentShippingAddress;

      if (selectedAddressId === NEW_ADDRESS_KEY && saveAddress) {
        try {
          const saveResponse = await updateShippingAddress({
            ...shippingAddressPayload,
            isDefault: savedAddresses.length === 0,
          });

          const updatedAddresses = extractShippingAddresses(saveResponse);
          setSavedAddresses(updatedAddresses);
        } catch (saveError) {
          toast.error(getApiErrorMessage(saveError, 'Không thể lưu địa chỉ vào profile'));
        }
      }

      const orderItemsPayload = cartItems
        .map((item) => ({
          product: item?._id || item?.id,
          qty: Math.max(1, Number(item?.qty || 1)),
        }))
        .filter((item) => Boolean(item.product));

      if (orderItemsPayload.length === 0) {
        throw new Error('Không có sản phẩm hợp lệ để tạo đơn hàng');
      }

      const orderPayload = {
        orderItems: orderItemsPayload,
        shippingAddress: shippingAddressPayload,
        paymentMethod,
      };

      const response = await createOrder(orderPayload);
      const createdOrder = extractDataObject(response);
      const createdOrderId = createdOrder?._id;

      clearCart();
      toast.success(response?.message || 'Đặt hàng thành công');

      if (createdOrderId) {
        navigate(`/orders/${createdOrderId}`, { replace: true });
      } else {
        navigate('/orders', { replace: true });
      }
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Không thể tạo đơn hàng');
      const fieldErrors = getFieldErrors(requestError);
      const mappedAddressErrors = mapAddressFieldErrors(fieldErrors);

      setAddressErrors((previous) => ({
        ...previous,
        ...mappedAddressErrors,
      }));
      setError(message);
      toast.error(message);
    } finally {
      setLoadingOrder(false);
    }
  };

  const stepClassName = (stepIndex) => {
    if (stepIndex + 1 === activeStep) {
      return 'is-active';
    }

    if (stepIndex + 1 < activeStep) {
      return 'is-completed';
    }

    return '';
  };

  return (
    <section className="checkout-page container">
      <header className="checkout-page__header">
        <h1>Thanh toán đơn hàng</h1>
        <p>Hoàn tất 3 bước để xác nhận đơn mua của bạn.</p>
      </header>

      <ol className="checkout-page__steps" aria-label="Tiến trình đặt hàng">
        {STEP_LABELS.map((label, index) => (
          <li key={label} className={stepClassName(index)}>
            <span>{index + 1}</span>
            <strong>{label}</strong>
          </li>
        ))}
      </ol>

      <div className="checkout-page__layout">
        <div className="checkout-page__content surface">
          {error ? (
            <Message variant="error" onClose={() => setError('')}>
              {error}
            </Message>
          ) : null}

          {activeStep === 1 ? (
            <div className="checkout-page__step">
              <h2>
                <FiMapPin /> Địa chỉ giao hàng
              </h2>

              {loadingProfile ? (
                <Loader inline text="Đang tải thông tin địa chỉ..." />
              ) : (
                <ShippingAddressForm
                  savedAddresses={savedAddresses}
                  selectedAddressId={selectedAddressId}
                  onSelectAddress={handleSelectAddress}
                  formData={addressForm}
                  onFormChange={handleAddressFieldChange}
                  saveAddress={saveAddress}
                  onSaveAddressChange={setSaveAddress}
                  errors={addressErrors}
                />
              )}
            </div>
          ) : null}

          {activeStep === 2 ? (
            <div className="checkout-page__step">
              <h2>Chọn phương thức thanh toán</h2>
              <PaymentMethodSelect
                value={paymentMethod}
                onChange={(value) => {
                  setPaymentMethod(value);
                  setPaymentError('');
                }}
                error={paymentError}
              />
            </div>
          ) : null}

          {activeStep === 3 ? (
            <div className="checkout-page__step">
              <h2>Xác nhận đơn hàng</h2>

              <div className="checkout-page__review-grid">
                <div className="checkout-page__review-card">
                  <h3>Thông tin giao hàng</h3>
                  <p>
                    <strong>{currentShippingAddress.fullName}</strong>
                  </p>
                  <p>{currentShippingAddress.phone}</p>
                  <p>
                    {currentShippingAddress.address}, {currentShippingAddress.city}, {currentShippingAddress.province}
                  </p>
                </div>

                <div className="checkout-page__review-card">
                  <h3>Thanh toán</h3>
                  <p>{PAYMENT_METHODS.find((item) => item.value === paymentMethod)?.label || paymentMethod}</p>
                </div>
              </div>

              <div className="checkout-page__review-items">
                {cartItems.map((item) => {
                  const qty = Math.max(1, Number(item?.qty || 1));
                  const unitPrice = getEffectivePrice(item);

                  return (
                    <article key={item?._id || item?.id || item?.slug} className="checkout-page__review-item">
                      <img src={item?.image || item?.images?.[0]} alt={item?.name || 'Sản phẩm'} loading="lazy" />
                      <div>
                        <h4>{item?.name || 'Sản phẩm không rõ tên'}</h4>
                        <p>
                          {formatPrice(unitPrice)} x {qty}
                        </p>
                      </div>
                      <strong>{formatPrice(unitPrice * qty)}</strong>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="checkout-page__actions">
            <button type="button" className="btn btn-outline" onClick={handleBackStep} disabled={activeStep === 1 || loadingOrder}>
              <FiArrowLeft /> Quay lại
            </button>

            {activeStep < 3 ? (
              <button type="button" className="btn btn-primary" onClick={handleNextStep} disabled={loadingProfile}>
                Tiếp tục <FiArrowRight />
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={handlePlaceOrder} disabled={loadingOrder}>
                <FiCheckCircle /> {loadingOrder ? 'Đang tạo đơn hàng...' : 'Đặt hàng'}
              </button>
            )}
          </div>
        </div>

        <aside className="checkout-page__summary surface">
          <h2>Tóm tắt đơn hàng</h2>

          <dl>
            <div>
              <dt>Số lượng sản phẩm</dt>
              <dd>{totals.itemsCount}</dd>
            </div>
            <div>
              <dt>Tạm tính</dt>
              <dd>{formatPrice(totals.subtotal)}</dd>
            </div>
            <div>
              <dt>Phí vận chuyển</dt>
              <dd>{totals.shippingFee === 0 ? 'Miễn phí' : formatPrice(totals.shippingFee)}</dd>
            </div>
          </dl>

          <p className="checkout-page__summary-note">
            Đơn từ {formatPrice(SHIPPING_FREE_THRESHOLD)} sẽ được miễn phí vận chuyển.
          </p>

          <div className="checkout-page__summary-total">
            <span>Tổng cộng</span>
            <strong>{formatPrice(totals.total)}</strong>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default CheckoutPage;
