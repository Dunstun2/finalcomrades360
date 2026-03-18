const { User } = require('../models');

/**
 * Calculate and return user verification status
 * Checks 4 requirements: profile, address, email, phone
 */
// Fixed syntax error: removed space in function name
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

module.exports = {
    getVerificationStatus
};
