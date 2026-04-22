const asyncHandler = require('express-async-handler');

const { uploadBufferToCloudinary } = require('../middleware/uploadMiddleware');

const uploadSingleImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Vui lòng chọn file ảnh để upload');
  }

  const result = await uploadBufferToCloudinary(req.file.buffer);

  res.status(200).json({
    success: true,
    message: 'Upload ảnh thành công',
    data: {
      url: result.url,
      public_id: result.public_id,
    },
  });
});

const uploadMultipleImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    res.status(400);
    throw new Error('Vui lòng chọn ít nhất 1 file ảnh để upload');
  }

  const uploadResults = await Promise.allSettled(
    req.files.map((file) => uploadBufferToCloudinary(file.buffer))
  );

  const success = [];
  const failed = [];

  uploadResults.forEach((result, index) => {
    const file = req.files[index];
    const fileName = String(file.originalname || `image_${index + 1}`).trim();

    if (result.status === 'fulfilled') {
      success.push({
        fileName,
        url: result.value.url,
        public_id: result.value.public_id,
      });
      return;
    }

    failed.push({
      fileName,
      errorCode: 'UPLOAD_FAILED',
      errorMessage: String(result.reason?.message || 'Upload ảnh thất bại').trim(),
    });
  });

  if (success.length === 0) {
    res.status(502).json({
      success: false,
      message: 'Không thể upload ảnh nào lên Cloudinary',
      data: {
        success,
        failed,
      },
    });
    return;
  }

  const isPartialFailure = failed.length > 0;

  res.status(isPartialFailure ? 207 : 200).json({
    success: true,
    message: isPartialFailure
      ? 'Upload ảnh hoàn tất với lỗi một phần'
      : 'Upload ảnh thành công',
    data: {
      success,
      failed,
    },
  });
});

module.exports = {
  uploadSingleImage,
  uploadMultipleImages,
};
