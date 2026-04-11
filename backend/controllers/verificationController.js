const { User } = require('../models');

/**
 * Calculate and return user verification status
 * Checks 4 requirements: profile, address, email, phone
 */
const getVerificationStatus = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findByPk(userId, {
            attributes: [
                'id', 'name', 'email', 'phone', 'role',
                'gender', 'dateOfBirth', 'bio',
                'county', 'town', 'estate', 'houseNumber',
                'emailVerified', 'phoneVerified', 'isVerified', 'nationalIdUrl', 'nationalIdStatus', 'nationalIdRejectionReason'
            ]
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isSuperAdmin = ['superadmin', 'super_admin', 'admin'].includes(user.role);

        console.log(`[Verification] User: ${user.email}, Role: ${user.role}, IsSuperAdmin: ${isSuperAdmin}, NatID: ${user.nationalIdUrl}`);

        // Check each requirement
        const checks = {
            profileComplete: isSuperAdmin || !!(user.gender && user.dateOfBirth),
            addressComplete: isSuperAdmin || !!(user.county && user.town && user.estate && user.houseNumber),
            emailVerified: isSuperAdmin || user.emailVerified === true,
            phoneVerified: isSuperAdmin || user.phoneVerified === true,
            nationalIdApproved: isSuperAdmin || user.nationalIdStatus === 'approved',
            nationalIdStatus: user.nationalIdStatus || 'none'
        };

        // Calculate if fully verified (only use essential boolean checks)
        const essentialChecks = {
            emailVerified: checks.emailVerified,
            phoneVerified: checks.phoneVerified,
            nationalIdApproved: checks.nationalIdApproved
        };
        const allVerified = Object.values(essentialChecks).every(v => v === true);

        // Update isVerified field if status changed
        await user.recalculateIsVerified();

        // Determine missing steps for better UX
        const missingSteps = [];
        // Profile and Address are now optional for account verification status but still recommended
        // We only add mandatory missing steps here
        if (!checks.emailVerified) {
            missingSteps.push({
                step: 'emailVerified',
                title: 'Verify Your Email',
                description: 'Confirm your email address',
                link: '/account/verify-email'
            });
        }
        if (!checks.phoneVerified) {
            missingSteps.push({
                step: 'phoneVerified',
                title: 'Verify Your Phone',
                description: 'Confirm your phone number via SMS',
                link: '/account/verify-phone'
            });
        }
        if (!checks.nationalIdApproved) {
            // Determine the state to show correct message
            const status = user.nationalIdStatus || 'none';
            let title = 'Upload National ID';
            let description = 'Upload a copy of your National ID for verification';

            if (status === 'pending') {
                title = 'National ID Pending Approval';
                description = 'Your document is under review. Please wait for admin approval.';
            } else if (status === 'rejected') {
                title = 'National ID Rejected';
                description = `Reason: ${user.nationalIdRejectionReason || 'Document invalid'}. Please re-upload.`;
            }

            missingSteps.push({
                step: 'nationalIdByAdmin',
                title,
                description,
                link: '/account/id-upload',
                status: status // Pass status to frontend
            });
        }

        console.log('[Verification] Status:', user.nationalIdStatus);

        res.json({
            success: true,
            isFullyVerified: allVerified,
            checks,
            nationalIdStatus: user.nationalIdStatus, // Return explicit status
            nationalIdRejectionReason: user.nationalIdRejectionReason,
            missingSteps,
            completionPercentage: Math.round((Object.values(essentialChecks).filter(v => v).length / Object.keys(essentialChecks).length) * 100),
            userData: {
                name: user.name,
                email: user.email,
                phone: user.phone,
                gender: user.gender,
                dateOfBirth: user.dateOfBirth,
                county: user.county,
                town: user.town,
                estate: user.estate,
                houseNumber: user.houseNumber
            }
        });

    } catch (error) {
        console.error('Error fetching verification status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch verification status',
            error: error.message
        });
    }
};

/**
 * Verify Firebase ID Token and update user phone verification status
 */
const verifyFirebaseToken = async (req, res) => {
  try {
    const { idToken, phone } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Firebase ID token is required' });
    }

    // Verify the ID token using Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebasePhone = decodedToken.phone_number;

    if (!firebasePhone) {
      return res.status(400).json({ success: false, message: 'Token does not contain a verified phone number' });
    }

    // Normalize phone numbers for comparison
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update user record
    user.phone = firebasePhone;
    user.phoneVerified = true;
    await user.save();

    console.log(`✅ [Firebase Verify] User ${user.id} verified phone: ${firebasePhone}`);

    res.json({
      success: true,
      message: 'Phone number verified successfully',
      phone: firebasePhone
    });

  } catch (error) {
    console.error('❌ [Firebase Verify] Verification failed:', error);
    res.status(401).json({
      success: false,
      message: 'Phone verification failed',
      error: error.message
    });
  }
};

const approveNationalId = async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.nationalIdStatus = 'approved';
        await user.save();

        res.json({ message: 'National ID approved successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error approving National ID', error: error.message });
    }
};

const rejectNationalId = async (req, res) => {
    const { userId } = req.params;
    const { reason } = req.body;
    try {
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.nationalIdStatus = 'rejected';
        user.nationalIdRejectionReason = reason;
        await user.save();

        res.json({ message: 'National ID rejected successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error rejecting National ID', error: error.message });
    }
};

module.exports = {
    getVerificationStatus
};
