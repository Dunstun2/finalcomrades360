const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const P = require('pino');
const path = require('path');
const fs = require('fs');

async function testBaileys() {
    console.log('🔍 Starting Baileys (No-Browser) Diagnostic...');
    
    const sessionDir = path.join(process.cwd(), '.wwebjs_auth/debug_session');
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

    try {
        console.log('📂 Testing session directory accessibility...');
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        
        console.log('🌐 Fetching latest WhatsApp version...');
        const { version } = await fetchLatestBaileysVersion();
        console.log('Version:', version.join('.'));

        console.log('🚀 Attempting to initialize socket (No browser)...');
        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            logger: P({ level: 'debug' }) // Enable debug logging for the test
        });

        sock.ev.on('connection.update', (update) => {
            const { connection, qr, lastDisconnect } = update;
            
            if (qr) {
                console.log('✅ SUCCESS: QR Code generated via socket!');
                console.log('QR String Length:', qr.length);
                process.exit(0);
            }

            if (connection === 'close') {
                console.log('❌ Connection closed:', lastDisconnect?.error?.message);
                process.exit(1);
            }
        });

        // Timeout after 30 seconds
        setTimeout(() => {
            console.error('⌛ TIMEOUT: Engine did not produce a QR code within 30s.');
            process.exit(1);
        }, 30000);

    } catch (err) {
        console.error('❌ FAILURE: Baileys failed to start.');
        console.error('Error:', err.message);
        
        if (err.message.includes('Cannot find module')) {
            console.error('💡 MISSING DEPENDENCY: You likely missed the "npm install" step.');
        }
    }
}

testBaileys();
