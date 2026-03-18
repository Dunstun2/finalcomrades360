const isValidEmail = (email = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validateKenyanPhone = (phone) => {
  if (!phone) return false;
  // Remove spaces, dashes, or parentheses if present
  const cleaned = String(phone).replace(/[\s\-\(\)]/g, '');

  // Regexp explanation:
  // ^              : Start of string
  // (
  //   \+254\d{9}   : +254 followed by exactly 9 digits
  //   |            : OR
  //   0(1|7)\d{8}  : 0 followed by 1 or 7, then exactly 8 digits
  // )
  // $              : End of string
  const kenyanPhoneRegex = /^(\+254\d{9}|0[17]\d{8})$/;

  return kenyanPhoneRegex.test(cleaned);
};

const normalizeKenyanPhone = (p = '') => {
  if (!p) return null;
  const s = String(p).replace(/[\s\-\(\)]/g, '');

  // 1. If it matches +254 format already
  if (/^\+254[17]\d{8}$/.test(s)) return s;

  // 2. If it's a local format (01... or 07...)
  if (/^0[17]\d{8}$/.test(s)) return '+254' + s.slice(1);

  // 3. Fallback: If it's 254... (12 digits) but missing +
  if (/^254[17]\d{8}$/.test(s)) return '+' + s;

  // If it doesn't match any, return null (invalid)
  return null;
};

module.exports = { isValidEmail, normalizeKenyanPhone, validateKenyanPhone };
