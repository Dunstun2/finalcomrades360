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
export const validateKenyanPhone = (phone) => {
    if (!phone) return false;
    // Remove spaces, dashes, or parentheses if present
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');

    // Regexp explanation:
    // ^              : Start of string
    // (
    //   \+254\d{9}   : +254 followed by exactly 9 digits
    //   |            : OR
    //   0(1|7)\d{8}  : 0 followed by 1 or 7, then exactly 8 digits
    // )
    // $              : End of string
    const kenyanPhoneRegex = /^(\+254\d{9}|0(1|7)\d{8})$/;

    return kenyanPhoneRegex.test(cleaned);
};

export const PHONE_VALIDATION_ERROR = "Phone number must be 10 digits starting with 07/01, or 13 characters starting with +254.";

/**
 * Restricts phone input to valid Kenyan format as user types
 * - Starts with 07 or 01: allows max 10 digits total
 * - Starts with +254: allows max 13 characters total
 * 
 * @param {string} value - The current input value
 * @returns {string} The formatted value with excess digits removed
 */
export const formatKenyanPhoneInput = (value) => {
    if (!value) return '';

    // Remove all non-digit characters except +
    let cleaned = value.replace(/[^\d+]/g, '');

    // If starts with +254
    if (cleaned.startsWith('+254')) {
        // Max 13 characters: +254 (4) + 9 digits
        return cleaned.slice(0, 13);
    }

    // If starts with + but not +254, limit to +254
    if (cleaned.startsWith('+')) {
        if (cleaned.length <= 4) {
            return cleaned.slice(0, 4);
        }
        // If user continues past 4 chars without completing +254, restrict
        return cleaned.slice(0, 4);
    }

    // If starts with 0 (local format - both 07 and 01)
    if (cleaned.startsWith('0')) {
        // Max 10 digits total (covers both 07XXXXXXXX and 01XXXXXXXX)
        return cleaned.slice(0, 10);
    }

    // If doesn't start with 0 or +, allow typing freely up to reasonable length
    // This handles the case where user hasn't typed the prefix yet
    return cleaned.slice(0, 13);
};

/**
 * Get dynamic maxLength based on what user is typing
 * @param {string} value - The current input value
 * @returns {number} The maximum length allowed
 */
export const getPhoneMaxLength = (value) => {
    if (!value) return 13;
    if (value.startsWith('+254')) return 13;
    if (value.startsWith('0')) return 10;
    return 13; // default to allow typing + prefix
};
