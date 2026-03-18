const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const {
	listMyNotifications,
	markNotificationRead,
	getUnreadCount,
	sendBatchNotifications,
	getNotificationPreferences,
	updateNotificationPreferences
} = require('../controllers/notificationController');

const router = express.Router()

router.use(auth)

// GET /api/notifications/my
router.get('/my', listMyNotifications)

// GET /api/notifications/unread-count
router.get('/unread-count', getUnreadCount)

// PATCH /api/notifications/:id/read
router.patch('/:id/read', markNotificationRead)

// POST /api/notifications/batch
router.post('/batch', adminOnly, sendBatchNotifications)

// GET /api/notifications/preferences
router.get('/preferences', getNotificationPreferences)

// PUT /api/notifications/preferences
router.put('/preferences', updateNotificationPreferences)

module.exports = router;
