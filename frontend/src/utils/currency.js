/**
 * Currency formatting utilities for consistent KES display
 */

export const formatKES = (amount, options = {}) => {
  const {
    showCurrency = true,
    showPlusSign = false,
    locale = 'en-KE',
    minimumFractionDigits = 0,
    maximumFractionDigits = 0
  } = options;

  // Round to nearest whole number
  const numAmount = Math.round(Number(amount || 0));
  const formattedNumber = numAmount.toLocaleString(locale, {
    minimumFractionDigits,
    maximumFractionDigits
  });

  if (!showCurrency) {
    return showPlusSign ? `+ ${formattedNumber}` : formattedNumber;
  }

  return showPlusSign ? `+ KES ${formattedNumber}` : `KES ${formattedNumber}`;
};

// Alias for easier migration
export const formatPrice = (amount) => formatKES(amount);

export const formatKESCompact = (amount) => {
  const numAmount = Math.round(Number(amount || 0));
  return `KES ${numAmount.toLocaleString('en-KE')}`;
};

export const parsePriceInput = (value) => {
  if (!value || value === '') return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};