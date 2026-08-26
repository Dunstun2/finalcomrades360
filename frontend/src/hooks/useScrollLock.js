import { useEffect } from 'react';

// Keep track of how many active locks are requested across the app
let activeLockCount = 0;

/**
 * Custom hook to lock body scrolling when a modal/overlay is open.
 * Supports multiple nested locks concurrently.
 * @param {boolean} isLocked - Whether the scroll lock is active.
 */
export default function useScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked) return;

    activeLockCount++;
    
    // Lock scroll on the first active lock
    if (activeLockCount === 1) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      activeLockCount--;
      // Restore scroll only when all locks are released
      if (activeLockCount <= 0) {
        document.body.style.overflow = 'unset';
        activeLockCount = 0; // Guard against negative values
      }
    };
  }, [isLocked]);
}
