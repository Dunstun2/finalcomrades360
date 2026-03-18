const { PickupStation, User } = require('../models');
const bcrypt = require('bcryptjs');

exports.createPickupStation = async (req, res) => {
    try {
        const { name, location, contactPhone, operatingHours, price, isActive, notes } = req.body;
        const station = await PickupStation.create({
            name,
            location,
            contactPhone,
            operatingHours,
            price,
            isActive,
            notes
        });
        res.status(201).json({ success: true, station });
    } catch (error) {
        console.error('Create station error:', error);
        res.status(500).json({ success: false, message: 'Failed to create pickup station' });
    }
};

exports.getAllPickupStations = async (req, res) => {
    try {
        const { activeOnly } = req.query;
        const where = {};
        if (activeOnly === 'true') {
            where.isActive = true;
        }

        const stations = await PickupStation.findAll({
            where,
            order: [['name', 'ASC']]
        });
        res.json({ success: true, stations });
    } catch (error) {
        console.error('Get all stations error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch pickup stations', error: error.message });
    }
};

exports.getPickupStationById = async (req, res) => {
    try {
        const station = await PickupStation.findByPk(req.params.id);
        if (!station) {
            return res.status(404).json({ success: false, message: 'Pickup station not found' });
        }
        res.json({ success: true, station });
    } catch (error) {
        console.error('Get station by ID error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch pickup station' });
    }
};

exports.updatePickupStation = async (req, res) => {
    try {
        const { name, location, contactPhone, operatingHours, price, isActive, notes } = req.body;
        const station = await PickupStation.findByPk(req.params.id);

        if (!station) {
            return res.status(404).json({ success: false, message: 'Pickup station not found' });
        }

        await station.update({
            name,
            location,
            contactPhone,
            operatingHours,
            price,
            isActive,
            notes
        });

        res.json({ success: true, station });
    } catch (error) {
        console.error('Update station error:', error);
        res.status(500).json({ success: false, message: 'Failed to update pickup station' });
    }
};

exports.deletePickupStation = async (req, res) => {
    try {
        const station = await PickupStation.findByPk(req.params.id);
        if (!station) {
            return res.status(404).json({ success: false, message: 'Pickup station not found' });
        }

        // Soft delete by setting isActive to false
        await station.update({ isActive: false });
        res.json({ success: true, message: 'Pickup station deactivated successfully' });
    } catch (error) {
        console.error('Delete station error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete pickup station' });
    }
};

exports.activatePickupStation = async (req, res) => {
    try {
        const station = await PickupStation.findByPk(req.params.id);
        if (!station) {
            return res.status(404).json({ success: false, message: 'Pickup station not found' });
        }

        await station.update({ isActive: true });
        res.json({ success: true, message: 'Pickup station activated successfully', station });
    } catch (error) {
        console.error('Activate station error:', error);
        res.status(500).json({ success: false, message: 'Failed to activate pickup station' });
    }
};


exports.hardDeletePickupStation = async (req, res) => {
    console.log(`[DEBUG-BACKEND] Hard delete hit for station ID: ${req.params.id}`);
    try {
        const { password } = req.body;
        const { Order } = require('../models');
        const { Op } = require('sequelize');

        if (!password) {
            return res.status(400).json({ success: false, message: 'Password is required for permanent deletion' });
        }

        // Verify admin/superadmin password
        const adminUser = await User.findByPk(req.user.id);
        if (!adminUser) {
            return res.status(404).json({ success: false, message: 'Admin user not found' });
        }

        const isMatch = await bcrypt.compare(password, adminUser.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Incorrect password. Deletion aborted.' });
        }

        const station = await PickupStation.findByPk(req.params.id);

        if (!station) {
            return res.status(404).json({ success: false, message: 'Pickup station not found' });
        }

        // Check for dependencies (Orders)
        const orderCount = await Order.count({
            where: {
                [Op.or]: [
                    { pickStation: station.name }
                ]
            }
        });

        if (orderCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot permanently delete station. It is linked to ${orderCount} historical orders. Deactivate it instead.`
            });
        }

        await station.destroy();
        res.json({ success: true, message: 'Pickup station permanently deleted successfully' });
    } catch (error) {
        console.error('Hard delete station error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete pickup station' });
    }
};
