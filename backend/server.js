const dotenv = require('dotenv');
dotenv.config();

const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');

const connectDB = require('./config/db');
const { attachRequestId } = require('./middleware/requestIdMiddleware');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const adminAuditRoutes = require('./routes/adminAuditRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_EXPIRE',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'CLIENT_URL',
];

const missingVars = requiredEnvVars.filter((name) => !process.env[name]);

if (missingVars.length > 0) {
  throw new Error(`Thiếu biến môi trường: ${missingVars.join(', ')}`);
}

const parseBooleanEnv = (value) => {
  if (value == null) {
    return undefined;
  }

  const normalizedValue = String(value).trim().toLowerCase();

  if (normalizedValue === 'true') {
    return true;
  }

  if (normalizedValue === 'false') {
    return false;
  }

  return undefined;
};

const parseAllowedOrigins = () => {
  const configuredOrigins = [process.env.ALLOWED_ORIGINS, process.env.CLIENT_URL]
    .filter(Boolean)
    .join(',')
    .split(',')
    .map((origin) => String(origin || '').trim())
    .filter(Boolean);

  return Array.from(new Set(configuredOrigins));
};

const isHttpsEnforced = () => {
  const manualOverride = parseBooleanEnv(process.env.ENFORCE_HTTPS);

  if (typeof manualOverride === 'boolean') {
    return manualOverride;
  }

  return process.env.NODE_ENV === 'production';
};

const app = express();

const trustProxyFromEnv = parseBooleanEnv(process.env.TRUST_PROXY);
const shouldTrustProxy =
  typeof trustProxyFromEnv === 'boolean'
    ? trustProxyFromEnv
    : process.env.NODE_ENV === 'production';

if (shouldTrustProxy) {
  app.set('trust proxy', 1);
}

const allowedOrigins = parseAllowedOrigins();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, allowedOrigins.includes(origin));
    },
    credentials: true,
  })
);
app.use(
  helmet({
    hsts: process.env.NODE_ENV === 'production',
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  })
);

app.use((req, res, next) => {
  if (!isHttpsEnforced()) {
    next();
    return;
  }

  const forwardedProtocol = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim()
    .toLowerCase();

  if (req.secure || forwardedProtocol === 'https') {
    next();
    return;
  }

  const host = String(req.headers.host || '').trim();

  if (!host) {
    next();
    return;
  }

  res.redirect(308, `https://${host}${req.originalUrl}`);
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(attachRequestId);

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/audit-logs', adminAuditRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`[server] TechShop API listening on port ${PORT}`);
  });
};

startServer();
