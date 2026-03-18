const { emitRealtimeUpdate } = require('../utils/realtimeEmitter');

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function inferScopeFromPath(path = '') {
  const clean = path.split('?')[0] || '';
  if (!clean.startsWith('/api/')) return 'system';
  const parts = clean.replace('/api/', '').split('/').filter(Boolean);
  return parts[0] || 'system';
}

function realtimeSyncMiddleware(req, res, next) {
  if (!MUTATING_METHODS.has(req.method)) return next();

  const originalJson = res.json.bind(res);

  res.json = (body) => {
    try {
      if (res.statusCode < 400) {
        emitRealtimeUpdate(inferScopeFromPath(req.originalUrl), {
          action: 'mutation',
          method: req.method,
          path: req.originalUrl,
          userId: req.user?.id || null,
          adminOnly: false,
          ok: true
        });
      }
    } catch (e) {
      console.warn('Realtime sync middleware emit failed:', e.message);
    }

    return originalJson(body);
  };

  next();
}

module.exports = { realtimeSyncMiddleware };
