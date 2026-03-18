const { FastFoodReview, User, FastFood } = require('../models');

exports.createReview = async (req, res) => {
    try {
        const { fastFoodId, rating, comment } = req.body;
        const userId = req.user.id;

        // Validation
        if (!fastFoodId || !rating) {
            return res.status(400).json({ success: false, message: 'Rating and Fast Food ID are required.' });
        }

        const review = await FastFoodReview.create({
            userId,
            fastFoodId,
            rating,
            comment,
            status: 'pending' // Default to pending
        });

        res.status(201).json({ success: true, message: 'Review submitted for approval.', data: review });
    } catch (error) {
        console.error('Create Review Error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit review.' });
    }
};

exports.getPublicReviews = async (req, res) => {
    try {
        const { fastFoodId } = req.params;
        const reviews = await FastFoodReview.findAll({
            where: { fastFoodId, status: 'approved' },
            include: [{ model: User, attributes: ['username', 'profileImage'] }],
            order: [['createdAt', 'DESC']]
        });

        res.json({ success: true, data: reviews });
    } catch (error) {
        console.error('Get Public Reviews Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch reviews.' });
    }
};

// Admin: Get all reviews (with filters)
exports.getAllReviews = async (req, res) => {
    try {
        const { status } = req.query;
        const where = {};
        if (status && status !== 'all') where.status = status;

        const reviews = await FastFoodReview.findAll({
            where,
            include: [
                { model: User, attributes: ['username', 'email'] },
                { model: FastFood, attributes: ['name'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({ success: true, data: reviews });
    } catch (error) {
        console.error('Get All Reviews Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch reviews.' });
    }
};

// Admin: Moderate Review
exports.updateReviewStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status.' });
        }

        const review = await FastFoodReview.findByPk(id);
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found.' });
        }

        review.status = status;
        await review.save();

        res.json({ success: true, message: `Review ${status} successfully.` });
    } catch (error) {
        console.error('Update Review Status Error:', error);
        res.status(500).json({ success: false, message: 'Failed to update review status.' });
    }
};

exports.deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        const review = await FastFoodReview.findByPk(id);
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

        await review.destroy();
        res.json({ success: true, message: 'Review deleted' });
    } catch (error) {
        console.error('Delete Review Error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete review' });
    }
}
