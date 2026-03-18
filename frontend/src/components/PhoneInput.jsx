import React from 'react';
import { formatKenyanPhoneInput, validateKenyanPhone, PHONE_VALIDATION_ERROR } from '../utils/validation';

/**
 * Reusable Phone Input Component with Kenyan phone validation
 * Automatically restricts input to valid Kenyan phone formats
 */
export const PhoneInput = ({
    value,
    onChange,
    name,
    placeholder = "e.g., 0712345678, 0123456789, or +254712345678",
    required = false,
    className = "",
    showError = false,
    error = "",
    disabled = false,
    id = null
}) => {
    const handleInput = (e) => {
        const formatted = formatKenyanPhoneInput(e.target.value);
        // Call parent's onChange with formatted value
        onChange({ target: { name, value: formatted } });
    };

    return (
        <div className="w-full">
            <input
                type="tel"
                id={id || name}
                name={name}
                value={value || ''}
                onInput={handleInput}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                className={className}
                autoComplete="tel"
            />
            {showError && error && (
                <p className="text-xs text-red-600 mt-1">{error}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
                Format: 07XXXXXXXX (10 digits) or 01XXXXXXXX (10 digits) or +2547/1XXXXXXXX (13 chars)
            </p>
        </div>
    );
};

export default PhoneInput;
