/**
 * patch-notification-templates.js
 * 
 * Patches the existing 'whatsapp_config' in PlatformConfig to inject
 * tracking links, dashboard links, and improved templates for all
 * notification events. Safe to run multiple times (idempotent).
 * 
 * Run: node scripts/patch-notification-templates.js
 */
const { PlatformConfig } = require('../models');

const SITE_URL = process.env.FRONTEND_URL || 'https://comrades360.shop';

const UPDATED_TEMPLATES = {
  // ✅ Customer receives after placing an order — with tracking link
  orderPlaced: `Hello {name}, your order #{orderNumber} has been placed successfully! 🛍️\n\nItems:\n{itemsList}\n\nDelivery Fee: KES {deliveryFee}\nTotal: KES {total}\nPayment: {paymentMethod}\n\nDelivery Information:\nMethod: {deliveryMethod}\nLocation: {deliveryLocation}\n\n🔍 Track your order here:\n${SITE_URL}/track/{orderNumber}\n\nThank you for shopping with Comrades360!`,

  // ✅ Seller confirms the order — with tracking link
  sellerConfirmed: `Hello {name}, good news! 🥗\n\nYour order #{orderNumber} has been confirmed by {sellerName} and is now being prepared.\n\nWe will notify you once it is handed over to our delivery agent.\n\n🔍 Track your order:\n${SITE_URL}/track/{orderNumber}\n\nThank you for choosing Comrades360!`,

  // ✅ Order is in transit — with tracking link
  orderInTransit: `Your order #{orderNumber} is on its way! 🚚\n\nHello {name}, your package has been collected by {agentName} ({agentPhone}) and is in transit.\n\nDelivery Information:\nMethod: {deliveryMethod}\nLocation: {deliveryAddress}\n\n🔍 Live tracking:\n${SITE_URL}/track/{orderNumber}\n\nPlease stay reachable for a smooth delivery!`,

  // ✅ Order out for delivery
  orderOutForDelivery: `Hello {name}, your order #{orderNumber} is out for delivery! 🚚\n\nAgent {agentName} ({agentPhone}) is heading to your location now.\n\nPlease keep your phone reachable.\n\n🔍 Track here:\n${SITE_URL}/track/{orderNumber}`,

  // ✅ Order ready at pickup station
  orderReadyPickup: `Your order #{orderNumber} is ready for collection! 📦\n\nHello {name}, your items are at the pickup station and ready for you.\n\nPickup Details:\nStation: {stationName}\nLocation: {stationLocation}\nContact: {stationPhone}\n\n🔍 View order status:\n${SITE_URL}/track/{orderNumber}\n\nSee you soon at Comrades360!`,

  // ✅ Order delivered — with thank you
  orderDelivered: `Hi {name}, your order #{orderNumber} has been delivered! ✅\n\nWe hope you love your purchase. Thank you for shopping with Comrades360! 🌟\n\nRate your experience and shop again:\n${SITE_URL}`,

  // ✅ Agent has arrived
  agentArrived: `Your delivery agent {agentName} has arrived at your location! 📍\n\nPlease meet them to collect your order #{orderNumber}.\nAgent Phone: {agentPhone}`,

  // ✅ Delivery update (generic)
  deliveryUpdate: `Hello, your order #{orderNumber} status has been updated to: {status}.\n\n{message}\n\n🔍 Track your order:\n${SITE_URL}/track/{orderNumber}`,

  // ✅ Thank you after delivery
  orderThankYou: `Hello {name}, thank you for shopping with Comrades360! 🌟\n\nYour order #{orderNumber} has been delivered.{suffix}\n\nWe value your support and look forward to serving you again!\n\n🛍️ Shop again: ${SITE_URL}`,

  // ✅ Seller receives a new order — with dashboard link
  sellerOrderPlaced: `🛍️ New Order Received!\n\nHello {name}, you have a new order #{orderNumber}.\n\nItems: {itemsList}\nTotal Earning: KES {amount}\n\nPlease confirm and prepare the items here:\n${SITE_URL}/dashboard-login?redirect=/seller/orders\n\nThank you for selling with Comrades360!`,

  // ✅ Agent task assigned — with dashboard link
  agentTaskAssigned: `You have been assigned a new delivery task for order #{orderNumber}. Type: {deliveryType}\n\nView your tasks here:\n${SITE_URL}/dashboard-login?redirect=/delivery-agent`,

  // ✅ Agent task reassigned
  agentTaskReassigned: `A delivery task for order #{orderNumber} has been reassigned to you.\n\nView your tasks:\n${SITE_URL}/dashboard-login?redirect=/delivery-agent`,

  // ✅ Admin notified of rejection
  adminTaskRejected: `Delivery agent {agentName} rejected task for order #{orderNumber}.\nReason: {reason}\n\nReview and reassign here:\n${SITE_URL}/dashboard-login?redirect=/admin/logistics`,

  // ✅ Marketer created customer account
  WELCOME_MARKETER_CREATED: `HELLO {name}, Your Comrades360 Account has been successfully created by {marketerName}.\n\nYour temporary password is: {tempPassword}\n\nPlease login and change your password immediately:\n${SITE_URL}/login\n\nWelcome to the Comrades360 family! 🎉`,

  // ✅ OTP / Verification (no links needed, keep clean)
  phoneVerification: `Your Comrades360 verification OTP is {otp}. It expires in 10 minutes.\n\n@comrades360.shop #{otp}`,
  registrationOtp: `Your Comrades360 registration code is: {otp}. It expires in {minutes} minutes.\n\n@comrades360.shop #{otp}`,
  guestCheckoutOtp: `Your Comrades360 guest checkout code is: {otp}. Valid for 10 minutes.\n\n@comrades360.shop #{otp}`,
  passwordReset: `Your Comrades360 password reset code is {otp}. It expires in {minutes} minutes.\n\n@comrades360.shop #{otp}`,
  securityChangeOtp: `Your Comrades360 security change OTP is {otp}. It expires in 10 minutes.\n\n@comrades360.shop #{otp}`,

  // ✅ Withdrawal processed
  withdrawalStatus: `Your withdrawal of KES {amount} has been processed successfully! 💰\n\nView your wallet:\n${SITE_URL}/dashboard/wallet`,

  // ✅ Marketer commission earned
  marketerOrderPlaced: `Success! 🚀 You have successfully placed order #{orderNumber} for {customerName}.\n\nTotal Amount: KES {total}\nYour Commission: KES {commission}\n\nView your dashboard:\n${SITE_URL}/dashboard-login?redirect=/marketer`,
};

async function patchTemplates() {
  try {
    console.log('🔧 Patching notification templates in database...');

    const record = await PlatformConfig.findOne({ where: { key: 'whatsapp_config' } });

    if (!record) {
      console.log('⚠️  No whatsapp_config found. Creating fresh record...');
      await PlatformConfig.create({
        key: 'whatsapp_config',
        value: JSON.stringify({
          method: 'cloud',
          metaAccessToken: '',
          metaPhoneNumberId: '',
          templates: UPDATED_TEMPLATES,
          channels: {
            passwordReset: { whatsapp: false, sms: true, email: true, in_app: false }
          }
        })
      });
      console.log('✅ Created fresh whatsapp_config with all templates.');
      return process.exit(0);
    }

    // Parse existing config
    const existing = typeof record.value === 'string' ? JSON.parse(record.value) : record.value;

    // Merge templates — updated templates override existing
    const mergedTemplates = {
      ...(existing.templates || {}),
      ...UPDATED_TEMPLATES
    };

    // Keep all other config (method, tokens, channels) intact
    const patched = {
      ...existing,
      templates: mergedTemplates
    };

    await record.update({ value: JSON.stringify(patched) });

    console.log(`✅ Successfully patched ${Object.keys(UPDATED_TEMPLATES).length} templates:`);
    Object.keys(UPDATED_TEMPLATES).forEach(k => console.log(`   • ${k}`));
    console.log('\n✅ All templates now include tracking/dashboard links where applicable.');
    process.exit(0);

  } catch (error) {
    console.error('❌ Patch failed:', error.message);
    process.exit(1);
  }
}

patchTemplates();
