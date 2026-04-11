/**
 * Robust utility to copy text to clipboard with a fallback for older browsers
 * or non-secure contexts where navigator.clipboard might be unavailable.
 * 
 * @param {string} text - The string to copy to the clipboard.
 * @returns {Promise<boolean>} - Returns true if successful, false otherwise.
 */
export const copyToClipboard = async (text) => {
  if (!text) return false;

  // 1. Try modern Clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Modern clipboard API failed, trying fallback...', err);
    }
  }

  // 2. Fallback: Create a hidden textarea and use execCommand('copy')
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Ensure the textarea is off-screen
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    
    // Select and copy
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    return successful;
  } catch (err) {
    console.error('Copy fallback failed:', err);
    return false;
  }
};
