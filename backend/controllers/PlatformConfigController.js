const { PlatformConfig } = require('../models');
const { emitRealtimeUpdate } = require('../utils/realtimeEmitter');

exports.getConfig = async (req, res) => {
    try {
        const { key } = req.params;
        
        // Define system defaults
        const defaults = {
            platform_settings: { siteName: 'Comrades360', siteDescription: 'Your trusted marketplace', contactEmail: 'admin@comrades360.com', supportPhone: '+254700000000', currency: 'KES', timezone: 'Africa/Nairobi' },
            mpesa_config: { consumerKey: '', consumerSecret: '', passkey: '', shortcode: '174379', stkTimeout: 60, mockMode: false },
            mpesa_manual_instructions: { paybill: '714888', accountNumber: '223052' },
            airtel_config: { clientId: '', clientSecret: '', callbackUrl: '' },
            sms_config: { username: '', apiKey: '', provider: 'africastalking' },
            whatsapp_config: { 
                method: 'local',
                templates: {
                    orderPlaced: `Hello {name}, your order #{orderNumber} has been placed successfully! 🛍️\n\nItems:\n{itemsList}\n\nTotal: KES {total}\nPayment: {paymentMethod}\n\nDelivery Information:\nMethod: {deliveryMethod}\nLocation: {deliveryLocation}\n\nThank you for shopping with Comrades360!`,
                    sellerConfirmed: `Hello {name}, good news! 🥗\n\nYour order #{orderNumber} has been confirmed by {sellerName} and is now being prepared.\n\nWe will notify you as soon as it is handed over to our delivery agent.\n\nThank you for choosing Comrades360!`,
                    orderInTransit: `Your order #{orderNumber} is on its way! 🚚\n\nHello {name}, your package has been collected by {agentName} ({agentPhone}) and is in transit.\n\nDelivery Information:\nMethod: {deliveryMethod}\nLocation: {deliveryAddress}\n\nPlease stay reachable for a smooth delivery!`,
                    orderReadyPickup: `Your order #{orderNumber} is ready for collection! 📦\n\nHello {name}, your items have arrived at the pickup location and are ready for you.\n\nPickup Details:\nStation: {stationName}\nLocation: {stationLocation}\nContact: {stationPhone}\n\nSee you soon at Comrades360!`,
                    orderDelivered: 'Hi {name}, your order #{orderNumber} has been delivered. Thank you!',
                    agentArrived: 'Your delivery agent {agentName} has arrived at your location! 📍 Please meet them to collect order #{orderNumber}.',
                    agentTaskAssigned: 'You have been assigned a new delivery task for order #{orderNumber}. Type: {deliveryType}',
                    agentTaskReassigned: 'A delivery task for order #{orderNumber} has been reassigned to you.',
                    adminTaskRejected: 'Delivery agent {agentName} rejected task for order #{orderNumber}. Reason: {reason}',
                    orderCancelled: `Order Notification: Cancellation ❌\n\nHello {name}, we regret to inform you that order #{orderNumber} has been cancelled.\n\nCancellation Details:\nReason: {reason}\n\nWe apologize for the inconvenience and hope to serve you again soon.`,
                    phoneVerification: 'Your Comrades360 verification OTP is {otp}. It expires in 10 minutes.',
                    passwordReset: 'Your Comrades360 password reset code is {otp}. It expires in {minutes} minutes.',
                    withdrawalStatus: 'Your withdrawal of KES {amount} has been processed successfully! 💰'
                },
                channels: {
                    passwordReset: { whatsapp: false, sms: true, email: true, in_app: false }
                }
            },
            finance_settings: { 
                referralSplit: { primary: 0.6, secondary: 0.4 }, 
                minPayout: { seller: 1000, marketer: 500, delivery_agent: 200, station_manager: 500, warehouse_manager: 1000, service_provider: 500 },
                withdrawalTiers: [
                    { min: 0, max: 1000, fee: 30 },
                    { min: 1001, max: 5000, fee: 50 },
                    { min: 5001, max: 10000, fee: 100 },
                    { min: 10001, max: 1000000, fee: 150 }
                ]
            },
            logistic_settings: { warehouseHours: { open: '08:00', close: '20:00' }, autoCancelUnpaidHours: 24, deliveryFeeBuffer: 0, autoApproveRequests: false },
            security_settings: { sessionTimeout: 30, passwordMinLength: 8, twoFactorEnabled: false, loginAttempts: 5, ipWhitelist: [] },
            notification_settings: { emailNotifications: true, smsNotifications: true, pushNotifications: false, orderConfirmations: true, deliveryUpdates: true },
            seo_settings: { title: 'Comrades360', description: 'Student Marketplace', keywords: 'university, marketplace', socialLinks: { facebook: '', instagram: '', twitter: '' } },
            maintenance_settings: { 
                enabled: false, 
                message: 'System is currently under maintenance.',
                dashboards: {
                    admin: { enabled: false, message: 'Admin dashboard is maintenance.' },
                    seller: { enabled: false, message: 'Seller portal is maintenance.' },
                    marketer: { enabled: false, message: 'Marketer hub is maintenance.' },
                    delivery: { enabled: false, message: 'Delivery app is maintenance.' },
                    station: { enabled: false, message: 'Station management is maintenance.' },
                    ops: { enabled: false, message: 'Operations dashboard is maintenance.' },
                    logistics: { enabled: false, message: 'Logistics dashboard is maintenance.' },
                    finance: { enabled: false, message: 'Finance dashboard is maintenance.' },
                    provider: { enabled: false, message: 'Service provider portal is maintenance.' }
                },
                sections: {
                    products: { enabled: false, hideFromPublic: true },
                    services: { enabled: false, hideFromPublic: true },
                    fastfood: { enabled: false, hideFromPublic: true }
                }
            },
            system_env: { server: { port: 4000, nodeEnv: 'development', baseUrl: 'http://localhost:4000', apiUrl: '/api' }, app: { frontendUrl: 'http://localhost:3000', supportEmail: 'support@comrades360.com' }, database: { dialect: 'sqlite', storage: './database.sqlite' } }
        };

        const config = await PlatformConfig.findOne({ where: { key } });
        const baseDefaults = defaults[key] || {};

        if (!config) {
            return res.json({ success: true, data: baseDefaults, isDefault: true });
        }

        // Attempt to parse JSON value if possible
        let dbValue = {};
        try {
            dbValue = typeof config.value === 'string' ? JSON.parse(config.value) : config.value;
        } catch (e) {
            // If not JSON, use as literal if string, else ignore
            dbValue = typeof config.value === 'string' ? config.value : {};
        }

        // Final result: Start with base defaults, overlay DB values
        let finalData = baseDefaults;

        if (dbValue && typeof dbValue === 'object' && !Array.isArray(dbValue)) {
            // Deep merge for known structures
            finalData = { ...baseDefaults, ...dbValue };
            
            // Nested merge for templates
            if (baseDefaults.templates && dbValue.templates && typeof dbValue.templates === 'object') {
                finalData.templates = { ...baseDefaults.templates, ...dbValue.templates };
            }
            
            // Nested merge for minPayout in finance_settings
            if (baseDefaults.minPayout && dbValue.minPayout && typeof dbValue.minPayout === 'object') {
                finalData.minPayout = { ...baseDefaults.minPayout, ...dbValue.minPayout };
            }
        } else if (dbValue !== undefined && dbValue !== null && dbValue !== '') {
            // If DB value is a primitive but we have defaults, prioritize DB value if it's not empty,
            // but for keys with defaults we expect objects, so this is a fallback.
            finalData = dbValue;
        }

        res.json({ success: true, data: finalData });
    } catch (error) {
        console.error('Get Config Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch config' });
    }
};

exports.updateConfig = async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        // Strict Role Check (Double Layer Security)
        // Strict Role Check (Double Layer Security)
        const userRoleStr = String(req.user?.role || '').toLowerCase();
        if (!['superadmin', 'super_admin', 'super-admin', 'admin'].includes(userRoleStr)) {
            return res.status(403).json({ success: false, message: 'Access denied. Admin or Super Admin only.' });
        }

        let stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

        const [config, created] = await PlatformConfig.findOrCreate({
            where: { key },
            defaults: { value: stringValue }
        });

        if (!created) {
            config.value = stringValue;
            await config.save();
        }

        // Broadcast maintenance updates via WebSockets
        if (key === 'maintenance_settings') {
            console.log('[PlatformConfigController] Broadcasting maintenance update...');
            emitRealtimeUpdate('maintenance', { 
                action: 'update',
                key: 'maintenance_settings',
                settings: value 
            });
        }

        res.json({ success: true, message: 'Settings updated successfully', data: value });
    } catch (error) {
        console.error('Update Config Error:', error);
        res.status(500).json({ success: false, message: 'Failed to update config' });
    }
};

const { getWhatsAppStatus, restartWhatsApp } = require('../utils/messageService');

exports.getWhatsAppStatus = async (req, res) => {
    try {
        const status = getWhatsAppStatus();
        res.json({ success: true, ...status });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch WhatsApp status' });
    }
};

exports.handleRestartWhatsApp = async (req, res) => {
    try {
        await restartWhatsApp();
        res.json({ success: true, message: 'WhatsApp restart initiated' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to restart WhatsApp' });
    }
};
