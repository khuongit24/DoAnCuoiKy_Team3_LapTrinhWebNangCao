import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiCamera, FiEdit2, FiLock, FiMapPin, FiPlus, FiTrash2 } from 'react-icons/fi';

import { changePassword, deleteShippingAddress, getProfile, updateShippingAddress } from '../api/userApi';
import { uploadSingle } from '../api/uploadApi';
import EmptyState from '../components/common/EmptyState';
import Loader from '../components/common/Loader';
import Message from '../components/common/Message';
import Modal from '../components/common/Modal';
import { useAuth } from '../hooks/useAuth';
import { getApiErrorMessage, getFieldErrors } from '../utils/errorUtils';
import { formatDate } from '../utils/helpers';
import './ProfilePage.css';

const EMAIL_REGEX = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
const PHONE_REGEX = /^(0[35789])[0-9]{8}$/;

const PROFILE_TABS = [
  { key: 'profile', label: 'Thông tin cá nhân' },
  { key: 'addresses', label: 'Địa chỉ giao hàng' },
  { key: 'password', label: 'Đổi mật khẩu' },
];

const EMPTY_ADDRESS_FORM = {
  addressId: '',
  fullName: '',
  phone: '',
  address: '',
  city: '',
  province: '',
  isDefault: false,
};

const extractDataObject = (response) => {
  if (response?.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
    return response.data;
  }

  if (response && typeof response === 'object' && !Array.isArray(response)) {
    return response;
  }

  return null;
};

const extractAddresses = (response) => {
  if (Array.isArray(response?.data?.shippingAddresses)) {
    return response.data.shippingAddresses;
  }

  if (Array.isArray(response?.shippingAddresses)) {
    return response.shippingAddresses;
  }

  return [];
};

const toProfileForm = (profile) => ({
  name: String(profile?.name || '').trim(),
  email: String(profile?.email || '').trim(),
  avatar: String(profile?.avatar || '').trim(),
});

const toAddressForm = (address = {}) => ({
  addressId: String(address?._id || '').trim(),
  fullName: String(address?.fullName || '').trim(),
  phone: String(address?.phone || '').trim(),
  address: String(address?.address || '').trim(),
  city: String(address?.city || '').trim(),
  province: String(address?.province || '').trim(),
  isDefault: Boolean(address?.isDefault),
});

const normalizeAddresses = (addresses) => {
  if (!Array.isArray(addresses)) {
    return [];
  }

  return addresses.map((item) => ({
    _id: String(item?._id || ''),
    fullName: String(item?.fullName || '').trim(),
    phone: String(item?.phone || '').trim(),
    address: String(item?.address || '').trim(),
    city: String(item?.city || '').trim(),
    province: String(item?.province || '').trim(),
    isDefault: Boolean(item?.isDefault),
  }));
};

const validateProfileForm = (formData) => {
  const nextErrors = {};

  if (!formData.name.trim()) {
    nextErrors.name = 'Vui lòng nhập họ tên';
  }

  if (!formData.email.trim()) {
    nextErrors.email = 'Vui lòng nhập email';
  } else if (!EMAIL_REGEX.test(formData.email.trim())) {
    nextErrors.email = 'Email không hợp lệ';
  }

  return nextErrors;
};

const validateAddressForm = (formData) => {
  const nextErrors = {};

  if (!formData.fullName.trim()) {
    nextErrors.fullName = 'Vui lòng nhập họ tên người nhận';
  }

  if (!formData.phone.trim()) {
    nextErrors.phone = 'Vui lòng nhập số điện thoại';
  } else if (!PHONE_REGEX.test(formData.phone.trim())) {
    nextErrors.phone = 'Số điện thoại phải có dạng 0[35789]XXXXXXXX';
  }

  if (!formData.address.trim()) {
    nextErrors.address = 'Vui lòng nhập địa chỉ';
  }

  if (!formData.city.trim()) {
    nextErrors.city = 'Vui lòng nhập quận/huyện';
  }

  if (!formData.province.trim()) {
    nextErrors.province = 'Vui lòng nhập tỉnh/thành phố';
  }

  return nextErrors;
};

const validatePasswordForm = (formData) => {
  const nextErrors = {};

  if (!formData.currentPassword.trim()) {
    nextErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại';
  }

  if (!formData.newPassword.trim()) {
    nextErrors.newPassword = 'Vui lòng nhập mật khẩu mới';
  } else if (formData.newPassword.length < 6) {
    nextErrors.newPassword = 'Mật khẩu mới phải có ít nhất 6 ký tự';
  }

  if (!formData.confirmNewPassword.trim()) {
    nextErrors.confirmNewPassword = 'Vui lòng xác nhận mật khẩu mới';
  } else if (formData.confirmNewPassword !== formData.newPassword) {
    nextErrors.confirmNewPassword = 'Mật khẩu xác nhận không khớp';
  }

  return nextErrors;
};

const ProfilePage = () => {
  const { user, updateProfile } = useAuth();

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [pageError, setPageError] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  const [profileData, setProfileData] = useState(null);
  const [profileForm, setProfileForm] = useState(() => toProfileForm(user));
  const [profileFieldErrors, setProfileFieldErrors] = useState({});
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [addressModalMode, setAddressModalMode] = useState('create');
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM);
  const [addressFieldErrors, setAddressFieldErrors] = useState({});
  const [savingAddress, setSavingAddress] = useState(false);

  const [addressToDelete, setAddressToDelete] = useState(null);
  const [deletingAddress, setDeletingAddress] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      setLoadingProfile(true);
      setPageError('');

      try {
        const response = await getProfile();

        if (!isMounted) {
          return;
        }

        const profile = extractDataObject(response) || {};
        const normalizedProfile = {
          ...profile,
          shippingAddresses: normalizeAddresses(profile?.shippingAddresses),
        };

        setProfileData(normalizedProfile);
        setProfileForm(toProfileForm(normalizedProfile));
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setPageError(getApiErrorMessage(requestError, 'Không thể tải thông tin profile'));
      } finally {
        if (isMounted) {
          setLoadingProfile(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const addresses = useMemo(
    () => normalizeAddresses(profileData?.shippingAddresses),
    [profileData?.shippingAddresses]
  );

  const handleProfileFieldChange = (fieldName, value) => {
    setProfileForm((previous) => ({
      ...previous,
      [fieldName]: value,
    }));

    setProfileFieldErrors((previous) => {
      if (!previous[fieldName]) {
        return previous;
      }

      return {
        ...previous,
        [fieldName]: '',
      };
    });
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();

    const nextErrors = validateProfileForm(profileForm);
    setProfileFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSavingProfile(true);
    setPageError('');

    try {
      const response = await updateProfile({
        name: profileForm.name.trim(),
        email: profileForm.email.trim().toLowerCase(),
        avatar: profileForm.avatar.trim(),
      });

      const updatedUser = extractDataObject(response) || {};

      setProfileData((previous) => ({
        ...(previous || {}),
        ...updatedUser,
        shippingAddresses: previous?.shippingAddresses || [],
      }));
      setProfileForm((previous) => ({
        ...previous,
        name: String(updatedUser?.name || previous.name),
        email: String(updatedUser?.email || previous.email),
        avatar: String(updatedUser?.avatar || previous.avatar),
      }));
      setEditingProfile(false);
    } catch (requestError) {
      setPageError(getApiErrorMessage(requestError, 'Không thể cập nhật profile'));
      setProfileFieldErrors((previous) => ({
        ...previous,
        ...getFieldErrors(requestError),
      }));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh hợp lệ');
      event.target.value = '';
      return;
    }

    setUploadingAvatar(true);

    try {
      const response = await uploadSingle(file);
      const url = String(response?.data?.url || '').trim();

      if (!url) {
        throw new Error('Không nhận được URL ảnh sau khi upload');
      }

      setProfileForm((previous) => ({
        ...previous,
        avatar: url,
      }));
      toast.success(response?.message || 'Upload ảnh thành công');
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, 'Không thể upload ảnh đại diện'));
    } finally {
      setUploadingAvatar(false);
      event.target.value = '';
    }
  };

  const openCreateAddressModal = () => {
    setAddressModalMode('create');
    setAddressForm({
      ...EMPTY_ADDRESS_FORM,
      fullName: profileForm.name || user?.name || '',
      isDefault: addresses.length === 0,
    });
    setAddressFieldErrors({});
    setAddressModalOpen(true);
  };

  const openEditAddressModal = (address) => {
    setAddressModalMode('edit');
    setAddressForm(toAddressForm(address));
    setAddressFieldErrors({});
    setAddressModalOpen(true);
  };

  const closeAddressModal = () => {
    setAddressModalOpen(false);
    setAddressFieldErrors({});
  };

  const handleAddressFieldChange = (fieldName, value) => {
    setAddressForm((previous) => ({
      ...previous,
      [fieldName]: value,
    }));

    setAddressFieldErrors((previous) => {
      if (!previous[fieldName]) {
        return previous;
      }

      return {
        ...previous,
        [fieldName]: '',
      };
    });
  };

  const syncAddressesToProfile = (nextAddresses) => {
    setProfileData((previous) => ({
      ...(previous || {}),
      shippingAddresses: normalizeAddresses(nextAddresses),
    }));
  };

  const handleSubmitAddress = async (event) => {
    event.preventDefault();

    const nextErrors = validateAddressForm(addressForm);
    setAddressFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSavingAddress(true);

    try {
      const payload = {
        fullName: addressForm.fullName.trim(),
        phone: addressForm.phone.trim(),
        address: addressForm.address.trim(),
        city: addressForm.city.trim(),
        province: addressForm.province.trim(),
        isDefault: Boolean(addressForm.isDefault),
      };

      if (addressModalMode === 'edit') {
        payload.addressId = addressForm.addressId;
      }

      const response = await updateShippingAddress(payload);
      const nextAddresses = extractAddresses(response);

      syncAddressesToProfile(nextAddresses);
      setAddressModalOpen(false);
      toast.success(response?.message || 'Cập nhật địa chỉ thành công');
    } catch (requestError) {
      setAddressFieldErrors((previous) => ({
        ...previous,
        ...getFieldErrors(requestError),
      }));
      toast.error(getApiErrorMessage(requestError, 'Không thể cập nhật địa chỉ'));
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSetDefaultAddress = async (address) => {
    if (!address?._id) {
      return;
    }

    try {
      const response = await updateShippingAddress({
        addressId: address._id,
        fullName: address.fullName,
        phone: address.phone,
        address: address.address,
        city: address.city,
        province: address.province,
        isDefault: true,
      });

      syncAddressesToProfile(extractAddresses(response));
      toast.success('Đã đặt địa chỉ mặc định');
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, 'Không thể đặt địa chỉ mặc định'));
    }
  };

  const handleDeleteAddress = async () => {
    if (!addressToDelete?._id) {
      return;
    }

    setDeletingAddress(true);

    try {
      const response = await deleteShippingAddress(addressToDelete._id);
      syncAddressesToProfile(extractAddresses(response));
      setAddressToDelete(null);
      toast.success(response?.message || 'Đã xóa địa chỉ thành công');
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, 'Không thể xóa địa chỉ'));
    } finally {
      setDeletingAddress(false);
    }
  };

  const handlePasswordFieldChange = (fieldName, value) => {
    setPasswordForm((previous) => ({
      ...previous,
      [fieldName]: value,
    }));

    setPasswordErrors((previous) => {
      if (!previous[fieldName]) {
        return previous;
      }

      return {
        ...previous,
        [fieldName]: '',
      };
    });
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();

    const nextErrors = validatePasswordForm(passwordForm);
    setPasswordErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setChangingPassword(true);

    try {
      const response = await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      toast.success(response?.message || 'Đổi mật khẩu thành công');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
      setPasswordErrors({});
    } catch (requestError) {
      setPasswordErrors((previous) => ({
        ...previous,
        ...getFieldErrors(requestError),
      }));
      toast.error(getApiErrorMessage(requestError, 'Không thể đổi mật khẩu'));
    } finally {
      setChangingPassword(false);
    }
  };

  if (loadingProfile) {
    return <Loader fullPage text="Đang tải thông tin profile..." />;
  }

  if (!profileData) {
    return (
      <section className="profile-page container">
        <Message variant="error">{pageError || 'Không thể tải profile'}</Message>
      </section>
    );
  }

  const profileAvatarFallback = String(profileData?.name || user?.name || 'U').charAt(0).toUpperCase();

  return (
    <section className="profile-page container">
      <header className="profile-page__header">
        <h1>Hồ sơ cá nhân</h1>
        <p>Quản lý thông tin tài khoản, địa chỉ giao hàng và bảo mật.</p>
      </header>

      {pageError ? (
        <Message variant="error" onClose={() => setPageError('')}>
          {pageError}
        </Message>
      ) : null}

      <div className="profile-page__tabs" role="tablist" aria-label="Các mục profile">
        {PROFILE_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`profile-page__tab ${activeTab === tab.key ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
            role="tab"
            aria-selected={activeTab === tab.key}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' ? (
        <div className="profile-page__card surface">
          <div className="profile-page__identity">
            {profileForm.avatar ? (
              <img src={profileForm.avatar} alt="Avatar người dùng" className="profile-page__avatar" />
            ) : (
              <div className="profile-page__avatar profile-page__avatar--fallback">{profileAvatarFallback}</div>
            )}

            <div>
              <h2>{profileData.name || '--'}</h2>
              <p>{profileData.email || '--'}</p>
              <p>Vai trò: {profileData.role || 'user'}</p>
              <p>Thành viên từ: {formatDate(profileData.createdAt)}</p>
            </div>
          </div>

          {!editingProfile ? (
            <button type="button" className="btn btn-outline" onClick={() => setEditingProfile(true)}>
              <FiEdit2 /> Chỉnh sửa thông tin
            </button>
          ) : (
            <form className="profile-page__form" onSubmit={handleSaveProfile} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-name">
                  Họ và tên
                </label>
                <input
                  id="profile-name"
                  className="form-input"
                  value={profileForm.name}
                  onChange={(event) => handleProfileFieldChange('name', event.target.value)}
                />
                {profileFieldErrors.name ? <small className="text-danger">{profileFieldErrors.name}</small> : null}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="profile-email">
                  Email
                </label>
                <input
                  id="profile-email"
                  className="form-input"
                  type="email"
                  value={profileForm.email}
                  onChange={(event) => handleProfileFieldChange('email', event.target.value)}
                />
                {profileFieldErrors.email ? <small className="text-danger">{profileFieldErrors.email}</small> : null}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="profile-avatar-url">
                  URL avatar
                </label>
                <input
                  id="profile-avatar-url"
                  className="form-input"
                  value={profileForm.avatar}
                  onChange={(event) => handleProfileFieldChange('avatar', event.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <div className="profile-page__upload-row">
                <label htmlFor="profile-avatar-upload" className="btn btn-outline">
                  <FiCamera /> {uploadingAvatar ? 'Đang upload...' : 'Upload avatar'}
                </label>
                <input
                  id="profile-avatar-upload"
                  type="file"
                  accept="image/*"
                  hidden
                  disabled={uploadingAvatar}
                  onChange={handleAvatarUpload}
                />
              </div>

              <div className="profile-page__actions">
                <button type="button" className="btn btn-outline" onClick={() => {
                  setEditingProfile(false);
                  setProfileForm(toProfileForm(profileData));
                  setProfileFieldErrors({});
                }}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingProfile || uploadingAvatar}>
                  {savingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : null}

      {activeTab === 'addresses' ? (
        <div className="profile-page__card surface">
          <div className="profile-page__card-header">
            <h2>Địa chỉ giao hàng</h2>
            <button type="button" className="btn btn-primary" onClick={openCreateAddressModal}>
              <FiPlus /> Thêm địa chỉ
            </button>
          </div>

          {addresses.length === 0 ? (
            <EmptyState
              title="Bạn chưa lưu địa chỉ nào"
              description="Thêm địa chỉ để đặt hàng nhanh hơn trong lần mua tiếp theo."
              action={
                <button type="button" className="btn btn-primary" onClick={openCreateAddressModal}>
                  Thêm địa chỉ đầu tiên
                </button>
              }
            />
          ) : (
            <div className="profile-page__address-grid">
              {addresses.map((address) => (
                <article key={address._id} className={`profile-page__address-card ${address.isDefault ? 'is-default' : ''}`}>
                  <header>
                    <h3>{address.fullName}</h3>
                    {address.isDefault ? <span>Mặc định</span> : null}
                  </header>

                  <p>{address.phone}</p>
                  <p>{address.address}</p>
                  <p>
                    {address.city}, {address.province}
                  </p>

                  <div className="profile-page__address-actions">
                    <button type="button" className="btn btn-outline" onClick={() => openEditAddressModal(address)}>
                      <FiEdit2 /> Sửa
                    </button>
                    <button type="button" className="btn btn-outline" onClick={() => setAddressToDelete(address)}>
                      <FiTrash2 /> Xóa
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => handleSetDefaultAddress(address)}
                      disabled={address.isDefault}
                    >
                      <FiMapPin /> Đặt mặc định
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {activeTab === 'password' ? (
        <div className="profile-page__card surface">
          <h2>Đổi mật khẩu</h2>

          <form className="profile-page__form" onSubmit={handleChangePassword} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="current-password">
                Mật khẩu hiện tại
              </label>
              <input
                id="current-password"
                className="form-input"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => handlePasswordFieldChange('currentPassword', event.target.value)}
              />
              {passwordErrors.currentPassword ? (
                <small className="text-danger">{passwordErrors.currentPassword}</small>
              ) : null}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="new-password">
                Mật khẩu mới
              </label>
              <input
                id="new-password"
                className="form-input"
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => handlePasswordFieldChange('newPassword', event.target.value)}
              />
              {passwordErrors.newPassword ? <small className="text-danger">{passwordErrors.newPassword}</small> : null}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirm-new-password">
                Xác nhận mật khẩu mới
              </label>
              <input
                id="confirm-new-password"
                className="form-input"
                type="password"
                value={passwordForm.confirmNewPassword}
                onChange={(event) => handlePasswordFieldChange('confirmNewPassword', event.target.value)}
              />
              {passwordErrors.confirmNewPassword ? (
                <small className="text-danger">{passwordErrors.confirmNewPassword}</small>
              ) : null}
            </div>

            <button type="submit" className="btn btn-primary" disabled={changingPassword}>
              <FiLock /> {changingPassword ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
            </button>
          </form>
        </div>
      ) : null}

      <Modal
        isOpen={addressModalOpen}
        onClose={closeAddressModal}
        title={addressModalMode === 'create' ? 'Thêm địa chỉ mới' : 'Cập nhật địa chỉ'}
      >
        <form className="profile-page__form" onSubmit={handleSubmitAddress} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="address-full-name">
              Họ tên người nhận
            </label>
            <input
              id="address-full-name"
              className="form-input"
              value={addressForm.fullName}
              onChange={(event) => handleAddressFieldChange('fullName', event.target.value)}
            />
            {addressFieldErrors.fullName ? <small className="text-danger">{addressFieldErrors.fullName}</small> : null}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="address-phone">
              Số điện thoại
            </label>
            <input
              id="address-phone"
              className="form-input"
              value={addressForm.phone}
              onChange={(event) => handleAddressFieldChange('phone', event.target.value)}
            />
            {addressFieldErrors.phone ? <small className="text-danger">{addressFieldErrors.phone}</small> : null}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="address-line">
              Địa chỉ
            </label>
            <input
              id="address-line"
              className="form-input"
              value={addressForm.address}
              onChange={(event) => handleAddressFieldChange('address', event.target.value)}
            />
            {addressFieldErrors.address ? <small className="text-danger">{addressFieldErrors.address}</small> : null}
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="address-city">
                Quận/Hủyện
              </label>
              <input
                id="address-city"
                className="form-input"
                value={addressForm.city}
                onChange={(event) => handleAddressFieldChange('city', event.target.value)}
              />
              {addressFieldErrors.city ? <small className="text-danger">{addressFieldErrors.city}</small> : null}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="address-province">
                Tỉnh/Thành phố
              </label>
              <input
                id="address-province"
                className="form-input"
                value={addressForm.province}
                onChange={(event) => handleAddressFieldChange('province', event.target.value)}
              />
              {addressFieldErrors.province ? <small className="text-danger">{addressFieldErrors.province}</small> : null}
            </div>
          </div>

          <label className="profile-page__checkbox">
            <input
              type="checkbox"
              checked={Boolean(addressForm.isDefault)}
              onChange={(event) => handleAddressFieldChange('isDefault', event.target.checked)}
            />
            <span>Đặt làm địa chỉ mặc định</span>
          </label>

          <div className="profile-page__actions">
            <button type="button" className="btn btn-outline" onClick={closeAddressModal}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={savingAddress}>
              {savingAddress ? 'Đang lưu...' : 'Lưu địa chỉ'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(addressToDelete)}
        onClose={() => setAddressToDelete(null)}
        title="Xác nhận xóa địa chỉ"
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setAddressToDelete(null)}>
              Hủy
            </button>
            <button type="button" className="btn btn-primary" onClick={handleDeleteAddress} disabled={deletingAddress}>
              {deletingAddress ? 'Đang xóa...' : 'Xác nhận xóa'}
            </button>
          </>
        }
      >
        <p>Bạn có chắc chắn muốn xóa địa chỉ này không? Hành động này không thể hoàn tác.</p>
      </Modal>
    </section>
  );
};

export default ProfilePage;
