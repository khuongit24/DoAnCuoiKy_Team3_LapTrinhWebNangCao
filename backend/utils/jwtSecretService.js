const normalizeSecret = (value) => String(value || '').trim();

const getCandidateSecrets = () => {
  return [
    normalizeSecret(process.env.JWT_SECRET_CURRENT),
    normalizeSecret(process.env.JWT_SECRET),
    normalizeSecret(process.env.JWT_SECRET_PREVIOUS),
  ].filter(Boolean);
};

const getCurrentJwtSigningSecret = () => {
  const signingSecret =
    normalizeSecret(process.env.JWT_SECRET_CURRENT) || normalizeSecret(process.env.JWT_SECRET);

  if (!signingSecret) {
    throw new Error('Thiếu biến môi trường JWT_SECRET hoặc JWT_SECRET_CURRENT');
  }

  return signingSecret;
};

const getJwtVerificationSecrets = () => {
  const verificationSecrets = Array.from(new Set(getCandidateSecrets()));

  if (verificationSecrets.length === 0) {
    throw new Error('Thiếu biến môi trường JWT_SECRET hoặc JWT_SECRET_CURRENT');
  }

  return verificationSecrets;
};

module.exports = {
  getCurrentJwtSigningSecret,
  getJwtVerificationSecrets,
};
