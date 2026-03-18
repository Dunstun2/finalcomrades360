const { getIO } = require('../realtime/socket');

function emitToUser(userId, event, payload) {
  const io = getIO();
  if (!io || !userId) return;
  io.to(`user_${userId}`).emit(event, payload);
  io.to(`user:${userId}`).emit(event, payload);
}

function emitToAdmins(event, payload) {
  const io = getIO();
  if (!io) return;
  io.to('admin').emit(event, payload);
  io.to('admin_room').emit(event, payload);
}

function emitRealtimeUpdate(scope, payload = {}) {
  const io = getIO();
  if (!io) return;
  const envelope = {
    scope,
    timestamp: new Date().toISOString(),
    ...payload
  };

  // Global dashboard-style feed for pages that want instant refresh triggers
  io.emit('realtime:update', envelope);

  // Targeted channels
  if (payload.userId) emitToUser(payload.userId, 'realtime:update', envelope);
  if (payload.sellerId) emitToUser(payload.sellerId, 'realtime:update', envelope);
  if (payload.adminOnly) emitToAdmins('realtime:update', envelope);
}

module.exports = {
  emitToUser,
  emitToAdmins,
  emitRealtimeUpdate
};
