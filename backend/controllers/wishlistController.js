const models = require('../models');

const addToWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, serviceId, fastFoodId, itemType = 'product' } = req.body;

    let itemId = productId || serviceId || fastFoodId;
    if (!itemId && req.body.itemId) itemId = req.body.itemId;

    if (!itemId) {
      return res.status(400).json({ message: 'Item ID is required' });
    }

    // Check if item exists
    let item;
    const queryOptions = { where: { id: itemId } };

    // Add approval check for products and services if they have it
    if (itemType === 'product') {
      queryOptions.where.approved = true;
      item = await models.Product.findOne(queryOptions);
    } else if (itemType === 'service') {
      item = await models.Service.findOne(queryOptions);
    } else if (itemType === 'fastfood') {
      item = await models.FastFood.findOne(queryOptions);
    }

    if (!item) {
      return res.status(404).json({ message: `${itemType} not found` });
    }

    // Check if already in wishlist
    const whereClause = { userId, itemType };
    if (itemType === 'product') whereClause.productId = itemId;
    else if (itemType === 'service') whereClause.serviceId = itemId;
    else if (itemType === 'fastfood') whereClause.fastFoodId = itemId;

    const existing = await models.Wishlist.findOne({
      where: whereClause
    });

    if (existing) {
      return res.status(409).json({ message: 'Item already in wishlist' });
    }

    // Add to wishlist
    const createData = { userId, itemType };
    if (itemType === 'product') createData.productId = itemId;
    else if (itemType === 'service') createData.serviceId = itemId;
    else if (itemType === 'fastfood') createData.fastFoodId = itemId;

    const wishlistItem = await models.Wishlist.create(createData);

    res.status(201).json({
      message: 'Added to wishlist',
      wishlistItem
    });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params; // Using productId as generic itemId from route
    const { itemType = 'product' } = req.query;

    const whereClause = { userId, itemType };
    const id = parseInt(productId);

    if (itemType === 'product') whereClause.productId = id;
    else if (itemType === 'service') whereClause.serviceId = id;
    else if (itemType === 'fastfood') whereClause.fastFoodId = id;

    const wishlistItem = await models.Wishlist.findOne({
      where: whereClause
    });

    if (!wishlistItem) {
      return res.status(404).json({ message: 'Item not found in wishlist' });
    }

    await wishlistItem.destroy();

    res.json({ message: 'Removed from wishlist' });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;

    const wishlistItems = await models.Wishlist.findAll({
      where: { userId },
      include: [
        {
          model: models.Product,
          as: 'Product',
          required: false,
          include: [{ model: models.User, as: 'seller', attributes: ['id', 'name'] }]
        },
        {
          model: models.Service,
          as: 'Service',
          required: false
        },
        {
          model: models.FastFood,
          as: 'FastFood',
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(wishlistItems);
  } catch (error) {
    console.error('Error fetching wishlist full error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

const checkWishlistStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    const { itemType = 'product' } = req.query;

    const whereClause = { userId, itemType };
    const id = parseInt(productId);

    if (itemType === 'product') whereClause.productId = id;
    else if (itemType === 'service') whereClause.serviceId = id;
    else if (itemType === 'fastfood') whereClause.fastFoodId = id;

    const item = await models.Wishlist.findOne({
      where: whereClause
    });

    res.json({ inWishlist: !!item });
  } catch (error) {
    console.error('Error checking wishlist status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  checkWishlistStatus
};

