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

eventTypes.forEach(event => {
  subscriptionEventBus.on(event, (data) => {
    console.log(`📣 [Subscription Event: ${event}]`, JSON.stringify(data));
  });
});

module.exports = subscriptionEventBus;
