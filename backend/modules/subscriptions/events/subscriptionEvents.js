const EventEmitter = require('events');

class SubscriptionEventsBus extends EventEmitter {}

const subscriptionEventBus = new SubscriptionEventsBus();

// Log events to console for debugging/audit trails in development
subscriptionEventBus.on('error', (err) => {
  console.error('🔥 [Subscription Event Bus Error]:', err);
});

// We register dynamic logger for all standard events
const eventTypes = [
  'SubscriptionCreated',
  'SubscriptionRenewed',
  'SubscriptionExpired',
  'SubscriptionPaused',
  'SubscriptionResumed',
  'MealSkipped',
  'MealRedeemed',
  'SellerQualified',
  'TrialStarted',
  'TrialEnded'
];

// Import Notification model dynamically to avoid circular dependencies
const getNotificationModel = () => {
  return require('../../../database/models.registry').Notification;
};

// Handle Subscription Cancellation notification
subscriptionEventBus.on('SubscriptionCancelled', async (data) => {
  console.log(`📣 [Subscription Event: SubscriptionCancelled]`, JSON.stringify(data));
  try {
    const Notification = getNotificationModel();
    if (Notification && data.userId) {
      // Load getDynamicMessage dynamically
      const { getDynamicMessage } = require('../../../utils/templateUtils');
      
      const refundMessage = (data.refundAmount && data.refundAmount > 0)
        ? `A prorated refund of KES ${data.refundAmount} has been credited to your Wallet for unfulfilled meals.\n`
        : '';
        
      const defaultTemplate = `Your subscription #{subscriptionId} has been successfully cancelled.\n\n{refundMessage}Reason: {reason}.`;
      
      const message = await getDynamicMessage('subscriptionCancelled', defaultTemplate, {
        subscriptionId: data.subscriptionId,
        refundMessage: refundMessage,
        reason: data.reason || 'Not specified'
      });

      await Notification.create({
        userId: data.userId,
        title: 'Subscription Cancelled',
        message: message,
        read: false
      });
    }
  } catch (err) {
    console.error('🔥 [Subscription Event Bus] Error creating cancellation notification:', err);
  }
});

eventTypes.forEach(event => {
  subscriptionEventBus.on(event, (data) => {
    console.log(`📣 [Subscription Event: ${event}]`, JSON.stringify(data));
  });
});

module.exports = subscriptionEventBus;
