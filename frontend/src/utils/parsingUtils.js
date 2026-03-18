/**
 * Robustly parses a value that might be stringified, double-stringified, or malformed JSON.
 * @param {any} val - The value to parse
 * @returns {any} - The parsed value
 */
const recursiveParse = (val) => {
    if (typeof val !== 'string') return val;
    const trimmed = val.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
        try {
            const parsed = JSON.parse(val);
            // If it's still a string and looks like JSON, keep parsing
            if (parsed !== val) return recursiveParse(parsed);
        } catch (e) {
            // Not valid JSON, return as is
        }
    }
    return val;
};

/**
 * Ensures a value is an array, parsing it if it's a stringified array.
 * @param {any} val - The value to treat as an array
 * @returns {Array} - An array
 */
const ensureArray = (val) => {
    const parsed = recursiveParse(val);
    if (Array.isArray(parsed)) return parsed;
    if (!parsed) return [];
    return [parsed];
};

const ensureObject = (val) => {
    const parsed = recursiveParse(val);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    return {};
};

/**
 * Deeply extracts a clean name and quantity from a potentially messy ingredient object/string.
 * Ensures that if a 'name' field contains more JSON or arrays, we dig until we find a real string.
 * @param {any} val - The ingredient data
 * @returns {Object} - { name, quantity }
 */
const normalizeIngredient = (val) => {
    const raw = recursiveParse(val);

    if (!raw) return { name: '', quantity: '' };

    // Case 1: Just a string - it's the name
    if (typeof raw === 'string') {
        // Final fallback: if after all parsing it still looks like JSON fragments, clean it
        if (raw.includes('{"') || raw.includes('["') || raw.includes('\\"')) {
            const cleaned = raw.replace(/[\[\]\{\}\"\\]/g, ' ').replace(/\s+/g, ' ').trim();
            return { name: cleaned, quantity: '' };
        }
        return { name: raw, quantity: '' };
    }

    // Case 2: It's an array (unexpected for a single item, but happens if data is nested)
    if (Array.isArray(raw)) {
        if (raw.length === 0) return { name: '', quantity: '' };
        // Recursively handle the first element
        return normalizeIngredient(raw[0]);
    }

    // Case 3: It's an object - extract name, quantity, unit
    if (typeof raw === 'object') {
        let name = '';
        const nameFieldValue = raw.name || '';

        // Dig into name if it's JSON/Object
        const inner = normalizeIngredient(nameFieldValue);
        name = inner.name;

        let quantityStr = '';
        const qty = raw.quantity || inner.quantity || '';
        const unit = raw.unit || '';

        if (qty || unit) {
            quantityStr = `${qty} ${unit}`.trim();
        }

        return { name: name || 'Unnamed Ingredient', quantity: quantityStr };
    }

    return { name: String(val), quantity: '' };
};

export {
    recursiveParse,
    ensureArray,
    ensureObject,
    normalizeIngredient
};
