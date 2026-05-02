const { BlockedIP } = require('../models');
const { Op } = require('sequelize');

const ipBlocker = async (req, res, next) => {
    try {
        const ip = req.ip;
        
        const isBlocked = await BlockedIP.findOne({
            where: {
                ipAddress: ip,
                [Op.or]: [
                    { expiresAt: { [Op.gt]: new Date() } },
                    { expiresAt: null }
                ]
            }
        });

        if (isBlocked) {
            console.warn(`[IPBlocker] Blocked request from ${ip}. Reason: ${isBlocked.reason}`);
            return res.status(403).json({ 
                message: 'Your IP address has been temporarily or permanently blocked from accessing this platform.',
                reason: isBlocked.reason 
            });
        }

        next();
    } catch (error) {
        console.error('[IPBlocker] Middleware error:', error);
        next(); // Don't block if DB check fails
    }
};

module.exports = ipBlocker;
