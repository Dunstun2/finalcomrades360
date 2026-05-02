const { AdminAuditLog } = require('../models');

/**
 * Logs an admin action to the AdminAuditLog table.
 * Non-fatal — never throws; errors are swallowed so the main operation succeeds.
 */
const logAdminAction = async ({ adminId, adminName, action, targetType, targetId, targetName, details, ip, userAgent }) => {
  try {
    await AdminAuditLog.create({ adminId, adminName, action, targetType, targetId: String(targetId || ''), targetName, details, ip, userAgent });
  } catch (e) {
    console.error('[AuditLog] Failed to log admin action:', e.message);
  }
};

/**
 * Express middleware factory — call auditLog(action) to auto-log after next().
 * Usage: router.post('/path', auth, adminOnly, auditLog('MY_ACTION'), handler)
 */
const auditLog = (action, targetTypeFn) => async (req, res, next) => {
  res.on('finish', async () => {
    if (res.statusCode < 400) {
      await logAdminAction({
        adminId: req.user?.id,
        adminName: req.user?.name,
        action,
        targetType: typeof targetTypeFn === 'function' ? targetTypeFn(req) : (targetTypeFn || null),
        targetId: req.params?.id || req.body?.userId || req.body?.orderId || null,
        ip: req.ip || req.headers['x-forwarded-for'],
        userAgent: req.headers['user-agent'],
        details: null,
      });
    }
  });
  next();
};

module.exports = { logAdminAction, auditLog };
