import { FiCreditCard, FiDollarSign, FiPackage } from 'react-icons/fi';

import { PAYMENT_METHODS } from '../../utils/constants';
import './PaymentMethodSelect.css';

const METHOD_META = {
  COD: {
    icon: FiPackage,
    description: 'Thanh toán sau khi nhận được hàng.',
  },
  BankTransfer: {
    icon: FiCreditCard,
    description: 'Chuyển khoản vào tài khoản ngân hàng của TechShop.',
  },
  Stripe: {
    icon: FiDollarSign,
    description: 'Thanh toán trực tuyến qua cổng Stripe.',
  },
};

const PaymentMethodSelect = ({ value = 'COD', onChange, error = '' }) => {
  return (
    <fieldset className="payment-method-select surface">
      <legend>Phương thức thanh toán</legend>

      <div className="payment-method-select__list">
        {PAYMENT_METHODS.map((method) => {
          const meta = METHOD_META[method.value] || METHOD_META.COD;
          const Icon = meta.icon;
          const checked = value === method.value;

          return (
            <label key={method.value} className={`payment-method-select__item ${checked ? 'is-active' : ''}`}>
              <input
                type="radio"
                name="paymentMethod"
                value={method.value}
                checked={checked}
                onChange={() => onChange(method.value)}
              />

              <div className="payment-method-select__body">
                <div className="payment-method-select__title">
                  <Icon />
                  <strong>{method.label}</strong>
                </div>
                <p>{meta.description}</p>
              </div>
            </label>
          );
        })}
      </div>

      {error ? <small className="text-danger">{error}</small> : null}
    </fieldset>
  );
};

export default PaymentMethodSelect;
