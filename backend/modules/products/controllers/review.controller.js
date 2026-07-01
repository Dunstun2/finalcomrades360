const { ProductReview, User, Product } = require('../../../database/models.registry');

const serializeReview = (review) => {
  const plain = review.get ? review.get({ plain: true }) : review;
  return {
    ...plain,
    itemType: 'product',
    userName: review.User?.username || plain.userName || null,
    userEmail: review.User?.email || plain.userEmail || null,
    itemName: review.Product?.name || plain.itemName || null
  };
};

exports.createReview = async (req, res) => {
  try {
    const productId = req.body.productId || req.params.id;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    if (!productId || !rating) {
      return res.status(400).json({ success: false, message: 'Rating and Product ID are required.' });
    }

    const review = await ProductReview.create({
      userId,
      productId,
      rating,
      comment,
      status: 'pending'
    });

    res.status(201).json({ success: true, message: 'Review submitted for approval.', data: serializeReview(review) });
  } catch (error) {
    console.error('Create Product Review Error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit review.' });
  }
};

exports.getPublicReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await ProductReview.findAll({
      where: { productId, status: 'approved' },
      include: [{ model: User, attributes: ['username', 'profileImage'] }],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: reviews.map((review) => serializeReview(review)) });
  } catch (error) {
    console.error('Get Product Public Reviews Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews.' });
  }
};

exports.getVendorReviews = async (req, res) => {
  try {
    const vendorIdParam = req.params.vendorId;
    const effectiveVendorId = vendorIdParam === 'me' ? req.user.id : parseInt(vendorIdParam, 10);

    if (vendorIdParam !== 'me' && !['admin', 'superadmin', 'super_admin'].includes(String(req.user.role).toLowerCase())) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (!effectiveVendorId || Number.isNaN(effectiveVendorId)) {
      return res.status(400).json({ success: false, message: 'Invalid vendor ID.' });
    }

    const where = {};
    if (req.query.status && req.query.status !== 'all') {
      where.status = req.query.status;
    }

    const reviews = await ProductReview.findAll({
      where,
      include: [
        {
          model: Product,
          where: { sellerId: effectiveVendorId },
          attributes: ['id', 'name', 'sellerId']
        },
        {
          model: User,
          attributes: ['username', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: reviews.map((review) => serializeReview(review)) });
  } catch (error) {
    console.error('Get Product Vendor Reviews Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews.' });
  }
};

exports.getAllReviews = async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status && status !== 'all') where.status = status;

    const reviews = await ProductReview.findAll({
      where,
      include: [
        { model: User, attributes: ['username', 'email'] },
        { model: Product, attributes: ['name', 'sellerId'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: reviews.map((review) => serializeReview(review)) });
  } catch (error) {
    console.error('Get Product All Reviews Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews.' });
  }
};

exports.updateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const review = await ProductReview.findByPk(id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    review.status = status;
    await review.save();

    res.json({ success: true, message: `Review ${status} successfully.` });
  } catch (error) {
    console.error('Update Product Review Status Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update review status.' });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await ProductReview.findByPk(id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    await review.destroy();
    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    console.error('Delete Product Review Error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete review' });
  }
};
