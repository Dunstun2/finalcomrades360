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
        let result = template;
        for (const [k, v] of Object.entries(data)) {
            result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
        }
        return result;
    } catch (err) {
        console.warn(`⚠️ [TemplateUtils] Failed to load template ${key}:`, err.message);
        return defaultTemplate;
    }
}

module.exports = { getDynamicMessage };
