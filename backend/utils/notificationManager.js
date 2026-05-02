const { sendCustomerNotificationAcrossChannels } = require('./notificationHelpers');

/**
 * Universal manager for sending multi-channel notifications.
 * This acts as a clean interface for controllers to dispatch notifications
 * without needing to know the internal details of channel selection or helper logic.
 */

/**
 * Send a notification to a user across all enabled channels
 * @param {Object} user - The user object (recipient)
 * @param {string} templateKey - The unique key for this notification type (used for DB template lookup)
 * @param {Object} data - Context data for template interpolation
 */
async function sendMultiChannelNotification(user, templateKey, data = {}) {
    try {
        // Provide intelligent defaults for common administrative notifications
        // These fallbacks are used if no template is found in the database (PlatformConfig)
        
        if (templateKey === 'password_reset_admin' && !data.defaultTemplate) {
            data.defaultTemplate = "Hello {userName}, your password has been reset by an administrator. \n\nYour temporary password is: {tempPassword}\n\nPlease login and change it immediately to secure your account.";
            data.title = data.title || "Security: Password Reset";
            data.type = data.type || "warning";
        }
        
        if (templateKey === 'wallet_adjustment' && !data.defaultTemplate) {
            data.defaultTemplate = "Hello {userName}, your wallet has been {type}ed by KES {amount}. \n\nReason: {reason}\nNew Balance: KES {newBalance}";
            data.title = data.title || "Wallet Update";
            data.type = data.type || "info";
        }

        if (templateKey === 'account_merge' && !data.defaultTemplate) {
            data.defaultTemplate = "Hello, your accounts have been merged. Your active account is now associated with this login. All your orders and balance have been transferred.";
            data.title = data.title || "Account Merge Completed";
            data.type = data.type || "success";
        }

        // Delegate to the core notification engine in notificationHelpers
        // notificationHelpers handles the logic for:
        // - Checking which channels (WhatsApp, SMS, Email, In-App) are enabled for this template
        // - Fetching custom templates from the database
        // - Performing variable interpolation ({name}, {orderNumber}, etc.)
        // - Handling socket.io real-time emissions
        return await sendCustomerNotificationAcrossChannels(templateKey, data, user);
    } catch (error) {
        console.error(`[NotificationManager] Failed to send ${templateKey}:`, error.message);
        return null;
    }
}

module.exports = {
    sendMultiChannelNotification
};
