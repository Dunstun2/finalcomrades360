const { PlatformConfig } = require('../models');

/**
 * Helper to fetch a template from the database or fallback to default
 */
async function getDynamicMessage(key, defaultTemplate, data = {}) {
    try {
        const configRecord = await PlatformConfig.findOne({ where: { key: 'whatsapp_config' } });
        let template = defaultTemplate;
        
        if (configRecord) {
            const dbConfig = typeof configRecord.value === 'string' ? JSON.parse(configRecord.value) : configRecord.value;
            template = dbConfig.templates?.[key] || defaultTemplate;
        }

        // Replace placeholders
        let result = String(template || "");
        for (const [k, v] of Object.entries(data)) {
            // Ensure v is a string and handle null/undefined/objects
            const replacement = (v === null || v === undefined) ? "" : String(v);
            result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), replacement);
        }
        return result;
    } catch (err) {
        console.warn(`⚠️ [TemplateUtils] Failed to load template ${key}:`, err.message);
        return defaultTemplate;
    }
}

async function getEnabledChannels(templateKey) {
    try {
        const configRecord = await PlatformConfig.findOne({ where: { key: 'whatsapp_config' } });
        if (configRecord) {
            const dbConfig = typeof configRecord.value === 'string' ? JSON.parse(configRecord.value) : configRecord.value;
            return dbConfig.channels?.[templateKey] || { whatsapp: true, sms: true, email: true, in_app: true }; // Default to all on
        }
    } catch (err) {
        console.warn(`⚠️ [TemplateUtils] Failed to load channels for ${templateKey}:`, err.message);
    }
    return { whatsapp: true, sms: true, email: true, in_app: true }; // Fallback
}

module.exports = { getDynamicMessage, getEnabledChannels };
