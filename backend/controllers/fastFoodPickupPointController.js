const { FastFoodPickupPoint } = require('../models');

function normalizePickupPointPayload(body = {}, { partial = false } = {}) {
    const payload = {};

    if (!partial || body.name !== undefined) {
        payload.name = body.name;
    }
    if (!partial || body.address !== undefined) {
        payload.address = body.address;
    }
    if (!partial || body.contactName !== undefined) {
        payload.contactName = body.contactName || null;
    }
    if (!partial || body.contactPhone !== undefined) {
        payload.contactPhone = body.contactPhone;
    }
    if (!partial || body.isActive !== undefined) {
        payload.isActive = typeof body.isActive === 'boolean'
            ? body.isActive
            : String(body.isActive).toLowerCase() === 'true';
    }
    if (!partial || body.deliveryFee !== undefined) {
        const parsedDeliveryFee = Number(body.deliveryFee);
        payload.deliveryFee = Number.isFinite(parsedDeliveryFee) ? parsedDeliveryFee : 0;
    }

    return payload;
}

// @desc    Get all pickup points
// @route   GET /api/fastfood/pickup-points
// @access  Public
exports.getPickupPoints = async (req, res) => {
    try {
        const points = await FastFoodPickupPoint.findAll({
            where: { isActive: true },
            order: [['name', 'ASC']]
        });
        res.status(200).json({ success: true, count: points.length, data: points });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all pickup points (Admin view)
// @route   GET /api/fastfood/pickup-points/admin
// @access  Private/Admin
exports.getAdminPickupPoints = async (req, res) => {
    try {
        const points = await FastFoodPickupPoint.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json({ success: true, count: points.length, data: points });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create pickup point
// @route   POST /api/fastfood/pickup-points
// @access  Private/Admin
exports.createPickupPoint = async (req, res) => {
    try {
        const payload = normalizePickupPointPayload(req.body);
        const point = await FastFoodPickupPoint.create(payload);
        res.status(201).json({ success: true, data: point });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update pickup point
// @route   PUT /api/fastfood/pickup-points/:id
// @access  Private/Admin
exports.updatePickupPoint = async (req, res) => {
    try {
        let point = await FastFoodPickupPoint.findByPk(req.params.id);
        if (!point) {
            return res.status(404).json({ success: false, message: 'Pickup point not found' });
        }

        const payload = normalizePickupPointPayload(req.body, { partial: true });
        await point.update(payload);
        point = await FastFoodPickupPoint.findByPk(req.params.id);
        res.status(200).json({ success: true, data: point });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete pickup point
// @route   DELETE /api/fastfood/pickup-points/:id
// @access  Private/Admin
exports.deletePickupPoint = async (req, res) => {
    try {
        const point = await FastFoodPickupPoint.findByPk(req.params.id);
        if (!point) {
            return res.status(404).json({ success: false, message: 'Pickup point not found' });
        }

        await point.destroy();
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
