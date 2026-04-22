const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      email: {
        type: String,
        default: '',
        trim: true,
        lowercase: true,
      },
      role: {
        type: String,
        default: '',
        trim: true,
      },
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    resource: {
      type: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },
      id: {
        type: String,
        default: '',
        trim: true,
      },
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['SUCCESS', 'FAILED'],
        message: 'Trạng thái audit log không hợp lệ',
      },
      index: true,
    },
    requestId: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    errorCode: {
      type: String,
      default: '',
      trim: true,
    },
    errorMessage: {
      type: String,
      default: '',
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    toJSON: {
      transform: function transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

auditLogSchema.pre('validate', function validateFailedAudit(next) {
  if (this.status === 'FAILED') {
    if (!this.errorCode) {
      this.invalidate('errorCode', 'errorCode là bắt buộc khi trạng thái FAILED');
    }

    if (!this.errorMessage) {
      this.invalidate('errorMessage', 'errorMessage là bắt buộc khi trạng thái FAILED');
    }
  }

  next();
});

auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ 'resource.type': 1, timestamp: -1 });
auditLogSchema.index({ 'actor.userId': 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
