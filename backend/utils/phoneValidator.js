/**
 * Validates Kenyan phone numbers.
 * Supported formats:
 * - 07... (10 digits)
 * - 01... (10 digits)
 * - +254... (13 characters: +254 + 9 digits)
 * 
 * @param {string} phone 
 * @returns {boolean}
 */
const validateKenyanPhone = (phone) => {
    if (!phone) return false;
    // Remove spaces, dashes, or parentheses if present
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');

    const kenyanPhoneRegex = /^(\+254\d{9}|0(1|7)\d{8})$/;

    return kenyanPhoneRegex.test(cleaned);
};

const PHONE_VALIDATION_ERROR = "Phone number must be 10 digits starting with 07/01, or 13 characters starting with +254.";

module.exports = {
    validateKenyanPhone,
    PHONE_VALIDATION_ERROR
};
