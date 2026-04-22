const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên'],
      trim: true,
      maxlength: [50, 'Tên không được vượt quá 50 ký tự'],
    },
    email: {
      type: String,
      required: [true, 'Vui lòng nhập email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Email không hợp lệ',
      ],
    },
    password: {
      type: String,
      required: [true, 'Vui lòng nhập mật khẩu'],
      minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'admin'],
        message: 'Role phải là user hoặc admin',
      },
      default: 'user',
    },
    permissionsVersion: {
      type: Number,
      default: 1,
      min: [1, 'permissionsVersion phải lớn hơn hoặc bằng 1'],
    },
    authSecurity: {
      failedLoginAttempts: {
        type: Number,
        default: 0,
        min: [0, 'failedLoginAttempts phải lớn hơn hoặc bằng 0'],
      },
      firstFailedLoginAt: {
        type: Date,
        default: null,
      },
      lastFailedLoginAt: {
        type: Date,
        default: null,
      },
      lockoutUntil: {
        type: Date,
        default: null,
      },
    },
    avatar: {
      type: String,
      default: '',
    },
    shippingAddresses: {
      type: [shippingAddressSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function transform(doc, ret) {
        delete ret.__v;
        delete ret.password;
        delete ret.authSecurity;
        return ret;
      },
    },
  }
);

userSchema.pre('save', async function hashPasswordBeforeSave() {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function matchPassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;