const { User, Notification } = require('../models');

/**
 * Get users with pending National ID verification
 */
const getPendingVerifications = async (req, res) => {
    try {
        const pendingUsers = await User.findAll({
            where: {
                nationalIdStatus: 'pending'
            },
            attributes: ['id', 'name', 'email', 'nationalIdUrl', 'createdAt']
        });

        res.json({
            success: true,
            count: pendingUsers.length,
            users: pendingUsers
        });
    } catch (error) {
        console.error('Error fetching pending verifications:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Review a verification request (Approve/Reject)
 */
const reviewVerification = async (req, res) => {
    try {
        const { userId, action, rejectionReason, nationalIdNumber } = req.body;

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ message: 'Invalid action. Must be approve or reject.' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let notificationTitle = '';
        let notificationMessage = '';

        if (action === 'approve') {
            if (!nationalIdNumber) {
                return res.status(400).json({ message: 'National ID number is required for approval.' });
            }
            user.nationalIdStatus = 'approved';
            user.nationalIdRejectionReason = null;
            user.nationalIdNumber = nationalIdNumber;

            notificationTitle = 'Account Verified';
            notificationMessage = 'Your account has been verified.';
        } else {
            user.nationalIdStatus = 'rejected';
            user.nationalIdRejectionReason = rejectionReason || 'Document rejected by admin';

            notificationTitle = 'Verification Rejected';
            notificationMessage = `Your identity verification was rejected. Reason: ${user.nationalIdRejectionReason}`;
        }

        await user.save();
        await user.recalculateIsVerified();

        // Send notification
        try {
            console.log(`[Verification] Attempting to notify user ${user.id} about ${action}...`);
            const notification = await Notification.create({
                userId: user.id,
                title: notificationTitle,
                message: notificationMessage,
                type: action === 'approve' ? 'success' : 'alert' // Adding type if model supports it (defaults to info if not)
            });
            console.log(`[Verification] Notification created successfully: ID ${notification.id}`);
        } catch (notifError) {
            console.error('[Verification] Error creating notification:', notifError);
        }

        res.json({
            success: true,
            message: `User verification ${action}ed successfully`,
            user: {
                id: user.id,
                nationalIdStatus: user.nationalIdStatus
            }
        });

    } catch (error) {
        console.error('Error reviewing verification:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getPendingVerifications,
    reviewVerification
};
