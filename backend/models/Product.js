const mongoose = require('mongoose');
const slugify = require('../utils/slugify');
const { CATEGORY_ENUM_VALUES } = require('../config/constants');

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên người đánh giá'],
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, 'Vui lòng chọn đánh giá'],
      min: [1, 'Rating tối thiểu là 1'],
      max: [5, 'Rating tối đa là 5'],
    },
    comment: {
      type: String,
      required: [true, 'Vui lòng nhập nhận xét'],
      maxlength: [1000, 'Nhận xét không được vượt quá 1000 ký tự'],
      trim: true,
    },
  },
  { timestamps: true }
);

const specSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Vui lòng nhập tên thông số'],
      trim: true,
    },
    value: {
      type: String,
      required: [true, 'Vui lòng nhập giá trị thông số'],
      trim: true,
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên sản phẩm'],
      trim: true,
      maxlength: [200, 'Tên sản phẩm không được vượt quá 200 ký tự'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    sku: {
      type: String,
      required: [true, 'Vui lòng nhập mã SKU'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Vui lòng chọn danh mục'],
      enum: {
        values: CATEGORY_ENUM_VALUES,
        message: 'Danh mục {VALUE} không hợp lệ',
      },
    },
    subcategory: {
      type: String,
      default: '',
      trim: true,
    },
    brand: {
      type: String,
      required: [true, 'Vui lòng nhập thương hiệu'],
      trim: true,
    },
    images: {
      type: [String],
      required: [true, 'Vui lòng thêm ít nhất 1 ảnh sản phẩm'],
      validate: {
        validator: function validateImages(images) {
          return Array.isArray(images) && images.length > 0;
        },
        message: 'Sản phẩm phải có ít nhất 1 ảnh',
      },
    },
    price: {
      type: Number,
      required: [true, 'Vui lòng nhập giá sản phẩm'],
      min: [0, 'Giá không được âm'],
    },
    salePrice: {
      type: Number,
      default: null,
      min: [0, 'Giá khuyến mãi không được âm'],
      validate: {
        validator: function validateSalePrice(value) {
          if (value == null) {
            return true;
          }

          if (this.price == null) {
            return true;
          }

          return value < this.price;
        },
        message: 'Giá khuyến mãi phải nhỏ hơn giá gốc',
      },
    },
    countInStock: {
      type: Number,
      required: [true, 'Vui lòng nhập số lượng tồn kho'],
      default: 0,
      min: [0, 'Số lượng tồn kho không được âm'],
    },
    specs: {
      type: [specSchema],
      default: [],
    },
    description: {
      type: String,
      required: [true, 'Vui lòng nhập mô tả sản phẩm'],
      maxlength: [5000, 'Mô tả không được vượt quá 5000 ký tự'],
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating không được nhỏ hơn 0'],
      max: [5, 'Rating không được lớn hơn 5'],
    },
    numReviews: {
      type: Number,
      default: 0,
      min: [0, 'Số lượng đánh giá không được âm'],
    },
    reviews: {
      type: [reviewSchema],
      default: [],
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ price: 1 });
productSchema.index({ category: 1, brand: 1, price: 1 });
productSchema.index({ isActive: 1, isFeatured: 1 });

productSchema.pre('save', function createSlugBeforeSave(next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name);
  }

  next();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;