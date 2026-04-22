import { useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FiImage, FiLoader, FiTrash2, FiUploadCloud } from 'react-icons/fi';

import { uploadMultiple, uploadSingle } from '../../api/uploadApi';
import { getApiErrorMessage } from '../../utils/errorUtils';
import './ImageUploader.css';

const MAX_FILES_PER_BATCH = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const normalizeImages = (images) => {
  if (!Array.isArray(images)) {
    return [];
  }

  const seen = new Set();
  const nextImages = [];

  images.forEach((item) => {
    const imageUrl = String(item || '').trim();

    if (!imageUrl || seen.has(imageUrl)) {
      return;
    }

    seen.add(imageUrl);
    nextImages.push(imageUrl);
  });

  return nextImages;
};

const extractUploadedUrls = (response) => {
  const urls = [];

  const pushUrl = (value) => {
    const nextUrl = String(value || '').trim();

    if (!nextUrl) {
      return;
    }

    urls.push(nextUrl);
  };

  if (typeof response?.data?.url === 'string') {
    pushUrl(response.data.url);
  }

  if (Array.isArray(response?.data?.success)) {
    response.data.success.forEach((item) => {
      if (typeof item === 'string') {
        pushUrl(item);
        return;
      }

      pushUrl(item?.url);
    });
  }

  if (Array.isArray(response?.data)) {
    response.data.forEach((item) => {
      if (typeof item === 'string') {
        pushUrl(item);
        return;
      }

      pushUrl(item?.url);
    });
  }

  if (Array.isArray(response?.urls)) {
    response.urls.forEach((item) => pushUrl(item));
  }

  return normalizeImages(urls);
};

const extractFailedUploads = (response) => {
  if (Array.isArray(response?.data?.failed)) {
    return response.data.failed;
  }

  return [];
};

const buildFileQueueByName = (files) => {
  const queueByName = new Map();

  files.forEach((file) => {
    const fileName = String(file?.name || '').trim();

    if (!fileName) {
      return;
    }

    const existingQueue = queueByName.get(fileName) || [];
    existingQueue.push(file);
    queueByName.set(fileName, existingQueue);
  });

  return queueByName;
};

const consumeFileFromQueue = (queueByName, fileName) => {
  const queue = queueByName.get(fileName) || [];

  if (queue.length === 0) {
    return null;
  }

  const nextFile = queue.shift();

  if (queue.length === 0) {
    queueByName.delete(fileName);
  } else {
    queueByName.set(fileName, queue);
  }

  return nextFile;
};

const ImageUploader = ({ images = [], onChange, disabled = false }) => {
  const fileInputRef = useRef(null);
  const failedUploadIdRef = useRef(0);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [failedUploads, setFailedUploads] = useState([]);
  const [retryingById, setRetryingById] = useState({});
  const normalizedImages = useMemo(() => normalizeImages(images), [images]);

  const isRetryingAny = useMemo(
    () => Object.values(retryingById).some((status) => Boolean(status)),
    [retryingById]
  );

  const toFailedUploadRecord = (item, fallbackFile) => {
    const fileName = String(item?.fileName || fallbackFile?.name || 'unknown').trim();

    return {
      id: `failed-upload-${Date.now()}-${(failedUploadIdRef.current += 1)}`,
      fileName: fileName || 'unknown',
      file: fallbackFile || null,
      errorCode: String(item?.errorCode || 'UPLOAD_FAILED').trim(),
      errorMessage: String(item?.errorMessage || 'Upload ảnh thất bại').trim(),
    };
  };

  const mapFailedUploadsWithFiles = (failedItems, selectedFiles) => {
    if (!Array.isArray(failedItems) || failedItems.length === 0) {
      return [];
    }

    const fileQueueByName = buildFileQueueByName(selectedFiles);

    return failedItems.map((failedItem) => {
      const failedFileName = String(failedItem?.fileName || '').trim();
      const matchedFile = consumeFileFromQueue(fileQueueByName, failedFileName);
      return toFailedUploadRecord(failedItem, matchedFile);
    });
  };

  const emitImagesChange = (nextImages) => {
    if (typeof onChange !== 'function') {
      return;
    }

    onChange(normalizeImages(nextImages));
  };

  const setErrorMessage = (message) => {
    setLocalError(message);
    toast.error(message);
  };

  const appendFailedUploads = (nextFailedUploads) => {
    if (!Array.isArray(nextFailedUploads) || nextFailedUploads.length === 0) {
      return;
    }

    setFailedUploads((previousFailedUploads) => [...previousFailedUploads, ...nextFailedUploads]);
  };

  const validateFiles = (files) => {
    if (!Array.isArray(files) || files.length === 0) {
      return 'Không có file ảnh nào được chọn';
    }

    if (files.length > MAX_FILES_PER_BATCH) {
      return `Mỗi lần chỉ được tải tối đa ${MAX_FILES_PER_BATCH} file`;
    }

    const invalidTypeFile = files.find(
      (file) => !ALLOWED_IMAGE_MIME_TYPES.has(String(file?.type || '').toLowerCase())
    );

    if (invalidTypeFile) {
      return 'Chỉ chấp nhận ảnh JPG, JPEG, PNG hoặc WEBP';
    }

    const tooLargeFile = files.find((file) => Number(file?.size || 0) > MAX_FILE_SIZE);

    if (tooLargeFile) {
      return 'Mỗi file ảnh phải nhỏ hơn hoặc bằng 5MB';
    }

    return '';
  };

  const handlePickFiles = () => {
    if (disabled || uploading || isRetryingAny) {
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';

    if (disabled || uploading || selectedFiles.length === 0) {
      return;
    }

    const validationMessage = validateFiles(selectedFiles);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setUploading(true);
    setLocalError('');

    try {
      const response = selectedFiles.length === 1
        ? await uploadSingle(selectedFiles[0])
        : await uploadMultiple(selectedFiles);

      const uploadedUrls = extractUploadedUrls(response);
      const failedItems = extractFailedUploads(response);
      const mappedFailedUploads = mapFailedUploadsWithFiles(failedItems, selectedFiles);

      if (uploadedUrls.length > 0) {
        emitImagesChange([...normalizedImages, ...uploadedUrls]);
      }

      if (mappedFailedUploads.length > 0) {
        appendFailedUploads(mappedFailedUploads);
        const failedMessage = `Có ${mappedFailedUploads.length} file tải lên thất bại. Vui lòng thử lại từng file.`;
        setLocalError(failedMessage);
        toast.error(failedMessage);
      }

      if (uploadedUrls.length === 0 && mappedFailedUploads.length === 0) {
        throw new Error('Không nhận được URL ảnh từ server');
      }

      if (uploadedUrls.length > 0 && mappedFailedUploads.length === 0) {
        toast.success(response?.message || 'Tải ảnh lên thành công');
      }
    } catch (requestError) {
      const failedItems = extractFailedUploads(requestError?.response?.data || requestError);
      const mappedFailedUploads = mapFailedUploadsWithFiles(failedItems, selectedFiles);

      if (mappedFailedUploads.length > 0) {
        appendFailedUploads(mappedFailedUploads);
        const failedMessage = `Có ${mappedFailedUploads.length} file tải lên thất bại. Vui lòng thử lại từng file.`;
        setErrorMessage(failedMessage);
      } else {
        const message = getApiErrorMessage(requestError, 'Không thể tải ảnh lên. Vui lòng thử lại.');
        setErrorMessage(message);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRetryFailedUpload = async (failedUploadId) => {
    const targetUpload = failedUploads.find((item) => item.id === failedUploadId);

    if (!targetUpload?.file || disabled || uploading) {
      return;
    }

    const validationMessage = validateFiles([targetUpload.file]);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setRetryingById((previousState) => ({
      ...previousState,
      [failedUploadId]: true,
    }));

    try {
      const response = await uploadSingle(targetUpload.file);
      const uploadedUrls = extractUploadedUrls(response);

      if (uploadedUrls.length === 0) {
        throw new Error('Không nhận được URL ảnh từ server');
      }

      emitImagesChange([...normalizedImages, ...uploadedUrls]);
      setFailedUploads((previousFailedUploads) => {
        return previousFailedUploads.filter((item) => item.id !== failedUploadId);
      });
      setLocalError('');
      toast.success(`Đã tải lại thành công ${targetUpload.fileName}`);
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Không thể tải ảnh lên. Vui lòng thử lại.');

      setFailedUploads((previousFailedUploads) => previousFailedUploads.map((item) => {
        if (item.id !== failedUploadId) {
          return item;
        }

        return {
          ...item,
          errorCode: String(requestError?.response?.data?.errorCode || item.errorCode || 'UPLOAD_FAILED').trim(),
          errorMessage: message,
        };
      }));

      setErrorMessage(`Retry thất bại cho ${targetUpload.fileName}. ${message}`);
    } finally {
      setRetryingById((previousState) => ({
        ...previousState,
        [failedUploadId]: false,
      }));
    }
  };

  const handleRemoveFailedUpload = (failedUploadId) => {
    setFailedUploads((previousFailedUploads) => {
      return previousFailedUploads.filter((item) => item.id !== failedUploadId);
    });
  };

  const handleRemoveImage = (imageIndex) => {
    if (disabled || uploading || isRetryingAny) {
      return;
    }

    const nextImages = normalizedImages.filter((_, currentIndex) => currentIndex !== imageIndex);
    emitImagesChange(nextImages);
    setLocalError('');
  };

  return (
    <div className="image-uploader">
      <div className="image-uploader__panel">
        <div className="image-uploader__actions">
          <button
            type="button"
            className={`btn btn-outline image-uploader__pick-btn ${disabled ? 'is-disabled' : ''}`}
            onClick={handlePickFiles}
            disabled={disabled || uploading || isRetryingAny}
            aria-label={uploading ? 'Đang tải ảnh' : 'Chọn ảnh để tải lên'}
          >
            <FiUploadCloud />
            <span>{uploading ? 'Đang tải ảnh...' : 'Chọn ảnh để tải lên'}</span>
          </button>

          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            disabled={disabled || uploading || isRetryingAny}
            aria-label="Tải ảnh sản phẩm"
          />

          {uploading ? (
            <p className="image-uploader__status" aria-live="polite">
              <FiLoader className="image-uploader__spinner" />
              Đang upload...
            </p>
          ) : (
            <p className="image-uploader__hint">
              Tối đa 5 file mỗi lần, chỉ hỗ trợ JPG/JPEG/PNG/WEBP, mỗi file {'<='} 5MB.
            </p>
          )}
        </div>

        {localError ? (
          <p className="image-uploader__error" role="alert">
            {localError}
          </p>
        ) : null}

        {failedUploads.length > 0 ? (
          <section className="image-uploader__failed" aria-live="polite" aria-label="Danh sách file upload lỗi">
            <h4 className="image-uploader__failed-title">File tải lên thất bại</h4>

            <ul className="image-uploader__failed-list">
              {failedUploads.map((failedUpload) => {
                const isRetrying = Boolean(retryingById[failedUpload.id]);

                return (
                  <li key={failedUpload.id} className="image-uploader__failed-item">
                    <div className="image-uploader__failed-meta">
                      <strong>{failedUpload.fileName}</strong>
                      <p>{failedUpload.errorCode}: {failedUpload.errorMessage}</p>
                    </div>

                    <div className="image-uploader__failed-actions">
                      <button
                        type="button"
                        className="btn btn-outline image-uploader__failed-retry"
                        onClick={() => handleRetryFailedUpload(failedUpload.id)}
                        disabled={disabled || uploading || isRetrying || !failedUpload.file}
                      >
                        {isRetrying ? 'Đang retry...' : 'Retry'}
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline image-uploader__failed-remove"
                        onClick={() => handleRemoveFailedUpload(failedUpload.id)}
                        disabled={isRetrying}
                      >
                        Bỏ qua
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>

      {normalizedImages.length === 0 ? (
        <div className="image-uploader__empty" aria-live="polite">
          <FiImage />
          <p>Chưa có ảnh nào được chọn</p>
        </div>
      ) : (
        <ul className="image-uploader__grid" aria-label="Danh sách ảnh sản phẩm">
          {normalizedImages.map((imageUrl, index) => (
            <li key={`${imageUrl}-${index + 1}`} className="image-uploader__item">
              <img
                src={imageUrl}
                alt={`Ảnh sản phẩm ${index + 1}`}
                className="image-uploader__thumb"
                loading="lazy"
              />

              <button
                type="button"
                className="image-uploader__remove"
                onClick={() => handleRemoveImage(index)}
                disabled={disabled || uploading || isRetryingAny}
                aria-label={`Xóa ảnh thứ ${index + 1}`}
              >
                <FiTrash2 />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ImageUploader;
