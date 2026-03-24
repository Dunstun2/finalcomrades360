/**
 * Checks if a seller's business profile is complete.
 * All fields on /seller/business-location are required.
 * 
 * @param {Object} user The user object from AuthContext
 * @returns {Boolean} True if all required business fields are provided
 */
export const isSellerProfileComplete = (user) => {
    if (!user) return false;

    const requiredFields = [
        'businessName',
        'businessAddress',
        'businessCounty',
        'businessTown',
        'businessLandmark',
        'businessPhone',
        'businessLat',
        'businessLng'
    ];

    return requiredFields.every(field => {
        const val = user[field];
        if (val === undefined || val === null) return false;
        if (typeof val === 'string') return val.trim().length > 0;
        // Coordinates (number) are already checked for null/undefined
        return true;
    });
};
