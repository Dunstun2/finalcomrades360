const { Notification, User } = require('../models/index');
const { Op } = require('sequelize');

const listMyNotifications = async (req, res) => {
  try {
    const rows = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['createdAt','DESC']]
    })
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.count({ where: { userId: req.user.id, read: false } })
    res.json({ count })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

const markNotificationRead = async (req, res) => {
  const { id } = req.params
  try {
    const n = await Notification.findByPk(id)
    if (!n || n.userId !== req.user.id) return res.status(404).json({ error: 'Not found' })
    n.read = true
    await n.save()
    res.json({ message: 'Marked as read', notification: n })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

const sendBatchNotifications = async (req, res) => {
  try {
    const { userIds, type, title, message, data } = req.body || {};

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'userIds array is required' });
    }

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'title and message are required' });
    }

    const payload = userIds.map((userId) => ({
      userId,
      type: type || 'general',
      title,
      message,
      data: data ? JSON.stringify(data) : null,
      read: false
    }));

    await Notification.bulkCreate(payload);

    try {
      const { getIO } = require('../realtime/socket');
      const io = getIO();
      if (io) {
        userIds.forEach((userId) => {
          io.to(`user:${userId}`).emit('notification', { type: type || 'general', title, message, data: data || null });
        });
      }
    } catch (e) {
      console.warn('Batch notification socket push failed:', e.message);
    }

    return res.json({ success: true, sent: payload.length });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};

const getNotificationPreferences = async (req, res) => {
  return res.json({
    success: true,
    preferences: {
      emailEnabled: true,
      orderUpdates: true,
      paymentNotifications: true,
      lowStockAlerts: true,
      marketingEmails: false,
      pushNotifications: true
    }
  });
};

const updateNotificationPreferences = async (req, res) => {
  const preferences = req.body || {};
  return res.json({ success: true, message: 'Preferences updated', preferences });
};

const notifyAdmins = async ({ type = 'system', title, message, data = null }) => {
  const admins = await User.findAll({
    where: { role: { [Op.in]: ['admin', 'superadmin'] } },
    attributes: ['id']
  });

  if (admins.length === 0) return;

  await Notification.bulkCreate(admins.map((a) => ({
    userId: a.id,
    type,
    title,
    message,
    data: data ? JSON.stringify(data) : null,
    read: false
  })));
};

module.exports = {
  listMyNotifications,
  getUnreadCount,
  markNotificationRead,
  sendBatchNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
  notifyAdmins
};
