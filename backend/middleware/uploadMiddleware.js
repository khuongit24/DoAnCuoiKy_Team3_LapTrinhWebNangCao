const cloudinary = require('cloudinary').v2;
const multer = require('multer');

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 5;

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
    return;
  }

  const error = new Error('Chỉ chấp nhận file ảnh JPG, JPEG, PNG hoặc WEBP');
  error.statusCode = 400;
  cb(error);
};

const uploadFactory = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
});

const upload = uploadFactory.single('image');
const uploadMultiple = uploadFactory.array('images', MAX_FILES);

const uploadBufferToCloudinary = (fileBuffer, folder = 'techshop/products') => {
  return new Promise((resolve, reject) => {
    if (!fileBuffer) {
      const error = new Error('Không tìm thấy dữ liệu file để upload');
      error.statusCode = 400;
      reject(error);
      return;
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    stream.end(fileBuffer);
  });
};

module.exports = {
  upload,
  uploadMultiple,
  uploadBufferToCloudinary,
};