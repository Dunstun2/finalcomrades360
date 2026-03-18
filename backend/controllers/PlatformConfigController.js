const { PlatformConfig } = require('../models');

exports.getConfig = async (req, res) => {
    try {
        const { key } = req.params;
        const config = await PlatformConfig.findOne({ where: { key } });

        if (!config) {
            return res.status(404).json({ success: false, message: 'Config not found' });
        }

        // Attempt to parse JSON value if possible, else return string
        let parsedValue = config.value;
        try {
            parsedValue = JSON.parse(config.value);
        } catch (e) {
            // Keep as string
        }

        res.json({ success: true, data: parsedValue });
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
        if (!['superadmin', 'super_admin', 'super-admin'].includes(userRoleStr)) {
            return res.status(403).json({ success: false, message: 'Access denied. Super Admin only.' });
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

        res.json({ success: true, message: 'Settings updated successfully', data: value });
    } catch (error) {
        console.error('Update Config Error:', error);
        res.status(500).json({ success: false, message: 'Failed to update config' });
    }
};
