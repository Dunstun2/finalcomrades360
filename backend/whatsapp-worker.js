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
    global.crypto = require('crypto').webcrypto || require('crypto');
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
let latestPairingCode = null;
let isInitializing = false;
let whatsappStatus = 'initializing'; // initializing | qr_ready | pairing | ready | disconnected | error
let reconnectTimeout = null;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

// Session directory
const sessionDir = path.join(__dirname, '.wwebjs_auth/baileys_session');
if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
}

// Log helper with memory usage
const log = (msg) => {
    const timestamp = new Date().toISOString();
    const mem = Math.round(process.memoryUsage().rss / 1024 / 1024);
    console.log(`[WhatsApp-Worker ${timestamp} | ${mem}MB] ${msg}`);
};

async function getBaileys() {
    if (!baileys) {
        log('📦 Loading @whiskeysockets/baileys...');
        baileys = await import('@whiskeysockets/baileys');
        log('✅ Baileys loaded.');
    }
    return baileys;
}

// Safely tear down the socket without crashing
function destroySocket() {
    if (sock) {
        try {
            sock.ev.removeAllListeners();
            sock.ws?.close();
        } catch (_) { /* ignore */ }
        sock = null;
    }
}

const initWhatsApp = async () => {
    if (isInitializing) {
        log('⚠️ Initialization already in progress, skipping...');
        return;
    }
    isInitializing = true;
    connectionAttempts++;
    log(`🔄 Initializing Baileys (attempt #${connectionAttempts})...`);
    whatsappStatus = 'initializing';
    latestQr = null;
    latestPairingCode = null;

    try {
        const {
            default: makeWASocket,
            useMultiFileAuthState,
            fetchLatestBaileysVersion,
            makeCacheableSignalKeyStore,
            DisconnectReason,
            Browsers,
            makeInMemoryStore
        } = await getBaileys();

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        
        // Use a hardcoded known-good version to skip the HTTP fetch (~10MB saved)
        // Update this periodically: https://wppconnect.io/wa-version/
        const version = [2, 3000, 1043857760]; // matches server's fetched version
        log(`📡 Using WA Web version: ${version.join('.')} (pinned)`);

        destroySocket();

        sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                // Use plain store (no caching layer) to save memory
                keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })),
            },
            printQRInTerminal: false,          // skip terminal QR render (saves buffer)
            logger: P({ level: 'silent' }),
            // Identify as Chrome desktop — most stable protocol path
            browser: ['Comrades360', 'Chrome', '124.0.6367.207'],

            // ─── Disable EVERYTHING non-essential to save RAM ──────────────
            syncFullHistory: false,
            shouldSyncHistoryMessage: () => false,
            fireInitQueries: false,
            markOnlineOnConnect: false,
            generateHighQualityLinkPreview: false,
            downloadHistory: false,
            emitOwnEvents: false,
            msgRetryCounterCache: null,      // no retry map in memory
            linkPreviewImageThumbnailWidth: 0,
            transactionOpts: { maxCommitRetries: 1, delayBetweenTriesMs: 500 },

            // ─── Timeouts tuned for shared hosting ────────────────────────
            qrTimeout: 55000,
            connectTimeoutMs: 30000,
            defaultQueryTimeoutMs: 30000,
            keepAliveIntervalMs: 30000,
            retryRequestDelayMs: 2000,

            // ─── Don't buffer incoming messages in memory ─────────────────
            getMessage: async () => undefined,
        });

        // Connection Update
        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                log('📱 QR Code Generated! Ready to scan.');
                latestQr = qr;
                whatsappStatus = 'qr_ready';
                if (global.gc) {
                    try { global.gc(); } catch (_) {}
                }
            }

            if (connection === 'connecting') {
                log('🔄 Connecting to WhatsApp servers...');
                whatsappStatus = 'initializing';
            }

            if (connection === 'open') {
                log('✅ WhatsApp Connected & Authenticated!');
                isWhatsAppReady = true;
                whatsappStatus = 'ready';
                latestQr = null;
                latestPairingCode = null;
                isInitializing = false;
                connectionAttempts = 0;
                if (reconnectTimeout) {
                    clearTimeout(reconnectTimeout);
                    reconnectTimeout = null;
                }
                // Nudge GC to free crypto buffers used during handshake
                if (global.gc) {
                    setTimeout(() => { try { global.gc(); } catch(_) {} }, 1000);
                    log('🧹 GC nudge triggered after connect.');
                }
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const errorMsg = lastDisconnect?.error?.message || 'Unknown';
                const isLoggedOut = statusCode === DisconnectReason.loggedOut;

                log(`❌ Connection closed. Code: ${statusCode} | Msg: ${errorMsg} | LoggedOut: ${isLoggedOut}`);
                isWhatsAppReady = false;
                isInitializing = false;
                destroySocket();

                if (isLoggedOut) {
                    log('🚪 Logged out. Clear session to re-pair.');
                    whatsappStatus = 'disconnected';
                    latestQr = null;
                } else if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
                    log(`🛑 Max reconnect attempts reached (${MAX_RECONNECT_ATTEMPTS}). Use /restart to retry.`);
                    whatsappStatus = 'error';
                } else {
                    // Exponential backoff — max 60s
                    const delay = Math.min(5000 * connectionAttempts, 60000);
                    log(`⏳ Reconnecting in ${delay / 1000}s... (attempt ${connectionAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
                    whatsappStatus = 'disconnected';
                    if (reconnectTimeout) clearTimeout(reconnectTimeout);
                    reconnectTimeout = setTimeout(() => {
                        if (!isWhatsAppReady && !isInitializing) initWhatsApp();
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
        console.error(err.stack);
        whatsappStatus = 'error';
        isWhatsAppReady = false;
        isInitializing = false;
        destroySocket();
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
        pairingCode: latestPairingCode,
        uptime: Math.floor(process.uptime()),
        memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024)
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', worker: 'comrades-whatsapp', isReady: isWhatsAppReady });
});

app.get('/qr', (req, res) => {
    if (!latestQr) {
        return res.status(404).json({
            success: false,
            message: isWhatsAppReady ? 'Already connected.' : 'QR not ready yet. Wait and retry.'
        });
    }
    res.json({ success: true, qr: latestQr });
});

// Pairing Code (alternative to QR scan)
app.post('/pairing-code', async (req, res) => {
    let { phoneNumber } = req.body;

    if (!phoneNumber) {
        return res.status(400).json({ success: false, message: 'Missing "phoneNumber" parameter' });
    }
    if (isWhatsAppReady) {
        return res.status(400).json({ success: false, message: 'Already connected. No pairing needed.' });
    }
    if (!sock) {
        return res.status(503).json({ success: false, message: 'Socket not initialized yet. Wait and retry.' });
    }
    if (whatsappStatus !== 'qr_ready' && whatsappStatus !== 'initializing') {
        return res.status(503).json({
            success: false,
            message: `Not ready for pairing. Status: "${whatsappStatus}". Try /restart first.`
        });
    }

    try {
        let clean = String(phoneNumber).replace(/[\s\-\(\)\+]/g, '');
        if (clean.startsWith('0')) clean = '254' + clean.substring(1);
        else if (/^[71]/.test(clean)) clean = '254' + clean;

        if (!/^\d{10,15}$/.test(clean)) {
            return res.status(400).json({
                success: false,
                message: `Invalid phone number: "${clean}". Use format: 254712345678`
            });
        }

        log(`📲 Requesting pairing code for: ${clean}`);
        whatsappStatus = 'pairing';

        const code = await sock.requestPairingCode(clean);
        latestPairingCode = code;
        whatsappStatus = 'qr_ready';

        log(`🔑 Pairing Code: ${code}`);

        return res.json({
            success: true,
            pairingCode: code,
            message: `Open WhatsApp → Linked Devices → Link with phone number → enter: ${code}`
        });
    } catch (err) {
        log(`❌ Pairing Code Error: ${err.message}`);
        whatsappStatus = 'error';
        isInitializing = false;
        destroySocket();
        // Auto-recover
        setTimeout(() => {
            connectionAttempts = 0;
            initWhatsApp();
        }, 3000);
        return res.status(500).json({
            success: false,
            message: `Pairing failed: ${err.message}. Worker restarting — retry in 10 seconds.`
        });
    }
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

// Soft Restart (keep session files)
app.post('/restart', async (req, res) => {
    log('🔄 Soft restart requested...');
    isWhatsAppReady = false;
    latestQr = null;
    latestPairingCode = null;
    connectionAttempts = 0;
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }
    destroySocket();
    isInitializing = false;
    setTimeout(() => initWhatsApp(), 1500);
    return res.json({ success: true, message: 'WhatsApp restart initiated.' });
});

// Hard Logout (wipe session + restart)
app.post('/logout', async (req, res) => {
    log('🚪 Hard logout + session wipe requested...');
    isWhatsAppReady = false;
    latestQr = null;
    latestPairingCode = null;
    connectionAttempts = 0;
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }
    if (sock) {
        try { await sock.logout(); } catch (_) { /* ignore */ }
    }
    destroySocket();
    isInitializing = false;

    try {
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
        }
        fs.mkdirSync(sessionDir, { recursive: true });
        log('🗑️  Session wiped.');
    } catch (e) {
        log(`⚠️  Session wipe error: ${e.message}`);
    }

    setTimeout(() => initWhatsApp(), 2000);
    return res.json({ success: true, message: 'WhatsApp logged out and session cleared. Restarting...' });
});

// Prevent any uncaught exception from terminating the worker process
process.on('uncaughtException', (err) => {
    log(`⚠️ Uncaught Exception: ${err.message}`);
    console.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
    log(`⚠️ Unhandled Rejection: ${reason}`);
});

// Start listening
const server = app.listen(PORT, HOST, () => {
    log(`🚀 WhatsApp Worker listening on http://${HOST}:${PORT}`);
});

// Graceful termination
const shutdown = (signal) => {
    log(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
        destroySocket();
        process.exit(0);
    });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
