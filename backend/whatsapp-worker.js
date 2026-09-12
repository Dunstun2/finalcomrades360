/**
 * Comrades360 Standalone WhatsApp Microservice Worker
 * 
 * Runs as an isolated PM2 process to handle Baileys (@whiskeysockets/baileys)
 * without affecting the main API server, database pools, or WebSockets.
 * 
 * Port: 5005 (Internal only: 127.0.0.1)
 */

// Polyfill for Node.js v18 and below
if (!global.crypto) {
    global.crypto = require('crypto');
}

const express = require('express');
const path = require('path');
const fs = require('fs');
const P = require('pino');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(express.json());

const PORT = process.env.WHATSAPP_WORKER_PORT || 5005;
const HOST = '127.0.0.1';

// State management
let baileys = null;
let sock = null;
let isWhatsAppReady = false;
let latestQr = null;
let isInitializing = false;
let whatsappStatus = 'initializing'; // initializing, qr_ready, ready, disconnected, error
let reconnectTimeout = null;

// Session directory
const sessionDir = path.join(__dirname, '.wwebjs_auth/baileys_session');
if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
}

// Log helper
const log = (msg) => {
    const timestamp = new Date().toISOString();
    console.log(`[WhatsApp-Worker ${timestamp}] ${msg}`);
};

async function getBaileys() {
    if (!baileys) {
        baileys = await import('@whiskeysockets/baileys');
    }
    return baileys;
}

const initWhatsApp = async () => {
    if (isInitializing) {
        log('⚠️ Initialization already in progress, skipping...');
        return;
    }
    isInitializing = true;
    log('🔄 Initializing Baileys Socket...');
    whatsappStatus = 'initializing';
    latestQr = null;

    try {
        const {
            default: makeWASocket,
            useMultiFileAuthState,
            fetchLatestBaileysVersion,
            makeCacheableSignalKeyStore,
            DisconnectReason
        } = await getBaileys();

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        
        let version = [2, 3000, 1015901307];
        try {
            const fetched = await fetchLatestBaileysVersion();
            version = fetched.version;
        } catch (vErr) {
            log(`Using fallback version: ${version.join('.')}`);
        }

        sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })),
            },
            printQRInTerminal: true,
            logger: P({ level: 'silent' }),
            browser: ['Comrades360', 'Chrome', '120.0.0'],
            syncFullHistory: false,
            markOnlineOnConnect: false,
            generateHighQualityLinkPreview: false
        });

        // Connection Update
        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                log('📱 QR Code Generated! Ready to scan.');
                latestQr = qr;
                whatsappStatus = 'qr_ready';
            }

            if (connection === 'connecting') {
                log('🔄 Connecting to WhatsApp servers...');
                whatsappStatus = 'initializing';
            }

            if (connection === 'open') {
                log('✅ WhatsApp Connected & Ready!');
                isWhatsAppReady = true;
                whatsappStatus = 'ready';
                latestQr = null;
                isInitializing = false;
                if (reconnectTimeout) {
                    clearTimeout(reconnectTimeout);
                    reconnectTimeout = null;
                }
            }

            if (connection === 'close') {
                const errorCode = lastDisconnect?.error?.output?.statusCode;
                const errorMsg = lastDisconnect?.error?.message || 'Unknown error';
                const shouldReconnect = errorCode !== DisconnectReason.loggedOut;

                log(`❌ Connection closed. Code: ${errorCode} (${errorMsg}) | Reconnect: ${shouldReconnect}`);
                isWhatsAppReady = false;
                whatsappStatus = 'disconnected';
                isInitializing = false;

                if (shouldReconnect) {
                    const delay = 15000;
                    log(`⏳ Retrying connection in ${delay / 1000}s...`);
                    if (reconnectTimeout) clearTimeout(reconnectTimeout);
                    reconnectTimeout = setTimeout(() => {
                        if (!isWhatsAppReady && !isInitializing) {
                            initWhatsApp();
                        }
                    }, delay);
                }
            }
        });

        // Save credentials
        sock.ev.on('creds.update', () => {
            saveCreds();
        });

    } catch (err) {
        log(`💥 Fatal Error in initWhatsApp: ${err.message}`);
        whatsappStatus = 'error';
        isWhatsAppReady = false;
        isInitializing = false;
        sock = null;
    }
};

// Start initialization
initWhatsApp();

// --- HTTP Routes ---

// Health & Status
app.get('/status', (req, res) => {
    res.json({
        success: true,
        isReady: isWhatsAppReady,
        status: whatsappStatus,
        qr: latestQr,
        uptime: Math.floor(process.uptime()),
        memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024)
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', worker: 'whatsapp-worker', isReady: isWhatsAppReady });
});

// Send Message Endpoint
app.post('/send', async (req, res) => {
    const { to, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({ success: false, message: 'Missing "to" or "message" parameter' });
    }

    if (!isWhatsAppReady || !sock) {
        return res.status(503).json({
            success: false,
            message: 'WhatsApp engine is not ready. Please scan the QR code first.',
            status: whatsappStatus
        });
    }

    try {
        const cleanNumber = String(to).replace(/[\s\-\(\)\+]/g, '');
        const jid = `${cleanNumber}@s.whatsapp.net`;

        log(`📤 Dispatching message to: ${jid}...`);
        const result = await sock.sendMessage(jid, { text: message });
        log(`✅ Message sent successfully! ID: ${result?.key?.id}`);

        res.json({
            success: true,
            messageId: result?.key?.id,
            status: 'sent'
        });
    } catch (err) {
        log(`❌ Send error: ${err.message}`);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Restart Connection Endpoint
app.post('/restart', async (req, res) => {
    log('🔄 Soft restart requested...');
    isWhatsAppReady = false;
    latestQr = null;
    if (sock) {
        try {
            sock.end(new Error('Manual Reconnect'));
        } catch (e) {
            log(`Restart error: ${e.message}`);
        }
    }
    setTimeout(initWhatsApp, 1500);
    res.json({ success: true, message: 'WhatsApp restart initiated' });
});

// Logout & Clear Session Endpoint
app.post('/logout', async (req, res) => {
    log('🚪 Hard logout requested (clearing session)...');
    isWhatsAppReady = false;
    latestQr = null;

    if (sock) {
        try {
            await sock.logout();
            sock = null;
        } catch (e) {
            log(`Logout error: ${e.message}`);
        }
    }

    try {
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
            fs.mkdirSync(sessionDir, { recursive: true });
        }
    } catch (e) {
        log(`Session cleanup error: ${e.message}`);
    }

    setTimeout(initWhatsApp, 2000);
    res.json({ success: true, message: 'WhatsApp logged out and session cleared' });
});

// Start listening
const server = app.listen(PORT, HOST, () => {
    log(`🚀 WhatsApp Worker listening on http://${HOST}:${PORT}`);
});

// Graceful termination
process.on('SIGTERM', () => {
    log('SIGTERM received. Shutting down WhatsApp Worker...');
    server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
    log('SIGINT received. Shutting down WhatsApp Worker...');
    server.close(() => process.exit(0));
});
