import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for auto-saving form data to localStorage
 * @param {string} key - Unique key for localStorage
 * @param {object} data - Form data to save
 * @param {function} onRestore - Callback when draft is found (optional)
 * @param {object} options - Options { debounceMs: number, enabled: boolean }
 * @returns {object} { clearDraft, lastSaved, hasDraft, isRestored }
 */
const useAutoSave = (key, data, onRestore = null, options = {}) => {
    const { debounceMs = 1000, enabled = true } = options;
    const [lastSaved, setLastSaved] = useState(null);
    const [hasDraft, setHasDraft] = useState(false);
    const [isRestored, setIsRestored] = useState(false);
    const saveTimeoutRef = useRef(null);
    const initialMount = useRef(true);

    // Load draft on mount
    useEffect(() => {
        if (!enabled || !key) return;

        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                setHasDraft(true);
                if (onRestore && !isRestored) {
                    const parsed = JSON.parse(saved);
                    console.log(`[useAutoSave] Restore draft found for key: ${key}`, parsed);
                    onRestore(parsed);
                    setIsRestored(true);
                }
            }
        } catch (e) {
            console.error('[useAutoSave] Error restoring draft:', e);
        }
    }, [key, enabled, onRestore, isRestored]);

    // Save on data change
    useEffect(() => {
        if (!enabled || !key || initialMount.current) {
            initialMount.current = false;
            return;
        }

        // Clear previous timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Set new timeout
        saveTimeoutRef.current = setTimeout(() => {
            try {
                // Create a copy to avoid mutating original data
                // We only save JSON-serializable data. Files are naturally excluded by JSON.stringify
                const dataToSave = {
                    ...data,
                    _lastSaved: new Date().toISOString()
                };

                localStorage.setItem(key, JSON.stringify(dataToSave));
                setLastSaved(new Date());
                setHasDraft(true);
                // console.log(`[useAutoSave] Saved draft for key: ${key}`);
            } catch (e) {
                console.error('[useAutoSave] Error saving draft:', e);
            }
        }, debounceMs);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [data, key, debounceMs, enabled]);

    const clearDraft = useCallback(() => {
        try {
            localStorage.removeItem(key);
            setHasDraft(false);
            setLastSaved(null);
            console.log(`[useAutoSave] Draft cleared for key: ${key}`);
        } catch (e) {
            console.error('[useAutoSave] Error clearing draft:', e);
        }
    }, [key]);

    return {
        clearDraft,
        lastSaved,
        hasDraft,
        isRestored
    };
};

export default useAutoSave;
