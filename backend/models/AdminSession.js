const mongoose = require('mongoose');

const adminSessionSchema = new mongoose.Schema(
  {
    sid: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    revokedReason: {
      type: String,
      default: '',
      trim: true,
    },
    permissionsVersion: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    metadata: {
      ip: {
        type: String,
        default: '',
        trim: true,
      },
      userAgent: {
        type: String,
        default: '',
        trim: true,
      },
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function transform(doc, ret) {
        delete ret.__v;
        delete ret.refreshTokenHash;
        return ret;
      },
    },
  }
);

adminSessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });

const AdminSession = mongoose.model('AdminSession', adminSessionSchema);

module.exports = AdminSession;
