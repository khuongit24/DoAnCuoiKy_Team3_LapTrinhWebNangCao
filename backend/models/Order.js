const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Vui lòng cung cấp sản phẩm'],
      ref: 'Product',
    },
    name: {
      type: String,
      required: [true, 'Thiếu tên sản phẩm snapshot'],
      trim: true,
    },
    image: {
      type: String,
      required: [true, 'Thiếu ảnh sản phẩm snapshot'],
    },
    price: {
      type: Number,
      required: [true, 'Thiếu giá sản phẩm snapshot'],
      min: [0, 'Giá sản phẩm snapshot không được âm'],
    },
    qty: {
      type: Number,
      required: [true, 'Vui lòng nhập số lượng sản phẩm'],
      min: [1, 'Số lượng tối thiểu là 1'],
    },
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Vui lòng nhập họ tên người nhận'],
      trim: true,
      maxlength: [100, 'Họ tên không được vượt quá 100 ký tự'],
    },
    phone: {
      type: String,
      required: [true, 'Vui lòng nhập số điện thoại'],
      match: [/^(0[35789])[0-9]{8}$/, 'Số điện thoại không hợp lệ'],
    },
    address: {
      type: String,
      required: [true, 'Vui lòng nhập địa chỉ'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'Vui lòng nhập quận/huyện'],
      trim: true,
    },
    province: {
      type: String,
      required: [true, 'Vui lòng nhập tỉnh/thành phố'],
      trim: true,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Vui lòng cung cấp người đặt hàng'],
      ref: 'User',
    },
    orderItems: {
      type: [orderItemSchema],
      required: [true, 'Đơn hàng phải có ít nhất 1 sản phẩm'],
      validate: {
        validator: function validateOrderItems(items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: 'Đơn hàng phải có ít nhất 1 sản phẩm',
      },
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: [true, 'Vui lòng nhập địa chỉ giao hàng'],
    },
    paymentMethod: {
      type: String,
      required: [true, 'Vui lòng chọn phương thức thanh toán'],
      enum: {
        values: ['COD', 'BankTransfer', 'Stripe'],
        message: 'Phương thức thanh toán {VALUE} không hợp lệ',
      },
    },
    paymentResult: {
      id: { type: String },
      status: { type: String },
      update_time: { type: String },
      email_address: { type: String },
    },
    itemsPrice: {
      type: Number,
      required: [true, 'Thiếu tổng tiền hàng'],
      default: 0,
      min: [0, 'Tổng tiền hàng không được âm'],
    },
    shippingPrice: {
      type: Number,
      required: [true, 'Thiếu phí vận chuyển'],
      default: 0,
      min: [0, 'Phí vận chuyển không được âm'],
    },
    totalPrice: {
      type: Number,
      required: [true, 'Thiếu tổng thanh toán'],
      default: 0,
      min: [0, 'Tổng thanh toán không được âm'],
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    status: {
      type: String,
      default: 'pending',
      enum: {
        values: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        message: 'Trạng thái {VALUE} không hợp lệ',
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;