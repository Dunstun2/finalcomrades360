#!/usr/bin/env node
/**
 * Request a WhatsApp Pairing Code for linking a phone number
 * Usage:
 *   node scripts/pair-whatsapp.js 0757588395
 *   node scripts/pair-whatsapp.js 254757588395
 */

const axios = require('axios');

const WORKER_URL = process.env.WHATSAPP_WORKER_URL || `http://127.0.0.1:${process.env.WHATSAPP_WORKER_PORT || 5005}`;
const rawPhone = process.argv[2] || '0757588395';

let phone = String(rawPhone).replace(/[\s\-\(\)\+]/g, '');
if (phone.startsWith('0')) {
  phone = '254' + phone.substring(1);
} else if (/^[71]/.test(phone)) {
  phone = '254' + phone;
}

async function requestPairing() {
  console.log(`\n======================================================`);
  console.log(`📱 Requesting WhatsApp Pairing Code for: +${phone}`);
  console.log(`📡 Connecting to WhatsApp Worker at ${WORKER_URL}...`);
  console.log(`======================================================\n`);

  try {
    // 1. Check worker status first
    let statusRes;
    try {
      statusRes = await axios.get(`${WORKER_URL}/status`, { timeout: 4000 });
    } catch (err) {
      console.error(`❌ Cannot connect to WhatsApp Worker at ${WORKER_URL}`);
      console.error(`   Ensure the worker is running. Start it with:`);
      console.error(`   > cd backend && node whatsapp-worker.js`);
      console.error(`   or in production:`);
      console.error(`   > pm2 start whatsapp-worker.js --name comrades-whatsapp`);
      process.exit(1);
    }

    if (statusRes.data?.ready) {
      console.log(`ℹ️  WhatsApp is ALREADY connected!`);
      console.log(`   If you want to link a new phone number, logout first:`);
      console.log(`   > curl -X POST ${WORKER_URL}/logout`);
      console.log(`   Then run this pairing script again.\n`);
      process.exit(0);
    }

    // 2. Request pairing code
    const res = await axios.post(
      `${WORKER_URL}/pairing-code`,
      { phoneNumber: phone },
      { timeout: 20000 }
    );

    if (res.data?.success && res.data?.pairingCode) {
      const code = res.data.pairingCode;
      console.log(`\n✨ ======================================================`);
      console.log(`🔑 YOUR PAIRING CODE IS:   \x1b[1m\x1b[32m${code}\x1b[0m`);
      console.log(`✨ ======================================================\n`);
      console.log(`📱 How to link on your phone (+${phone}):`);
      console.log(`   1. Open WhatsApp on your phone`);
      console.log(`   2. Tap the 3 dots (⋮) on Android or Settings on iPhone`);
      console.log(`   3. Select "Linked Devices"`);
      console.log(`   4. Tap "Link a device"`);
      console.log(`   5. Tap "Link with phone number instead" at the bottom`);
      console.log(`   6. Enter the 8-character code: \x1b[1m\x1b[32m${code}\x1b[0m\n`);
      console.log(`⏰ Code expires in about 60 seconds.`);
      console.log(`======================================================\n`);
    } else {
      console.error(`⚠️ Pairing code request did not return a code:`, res.data);
    }
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    console.error(`\n❌ Failed to get pairing code:`, errorMsg);
    if (errorMsg.includes('Try /restart') || errorMsg.includes('Not ready')) {
      console.log(`\n💡 Tip: Restart the worker to get a fresh socket:`);
      console.log(`   curl -X POST ${WORKER_URL}/restart`);
      console.log(`   Wait 5 seconds and run this script again.`);
    }
  }
}

requestPairing();
