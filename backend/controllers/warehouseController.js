const { Warehouse, User } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

// GET /api/warehouses - List all warehouses
exports.listWarehouses = async (req, res) => {
    try {
        const { active, search } = req.query;
        const where = {};

        if (active !== undefined) {
            where.isActive = active === 'true';
        }

        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { code: { [Op.like]: `%${search}%` } },
                { town: { [Op.like]: `%${search}%` } }
            ];
        }

        const warehouses = await Warehouse.findAll({
            where,
            order: [['name', 'ASC']]
        });

        res.json({ success: true, warehouses });
    } catch (error) {
        console.error('Error fetching warehouses:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch warehouses', error: error.message });
    }
};

// GET /api/warehouses/:id - Get single warehouse
exports.getWarehouse = async (req, res) => {
    try {
        const warehouse = await Warehouse.findByPk(req.params.id);

        if (!warehouse) {
            return res.status(404).json({ success: false, message: 'Warehouse not found' });
        }

        res.json({ success: true, warehouse });
    } catch (error) {
        console.error('Error fetching warehouse:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch warehouse', error: error.message });
    }
};

// POST /api/warehouses - Create warehouse (Admin only)
exports.createWarehouse = async (req, res) => {
    try {
        const {
            name, code, address, county, town, landmark,
            contactPerson, contactPhone, contactEmail,
            capacity, operatingHours, isActive, notes
        } = req.body;

        // Validation
        if (!name || !address) {
            return res.status(400).json({
                success: false,
                message: 'Warehouse name and address are required'
            });
        }

        // Check for duplicate code if provided
        if (code) {
            const existing = await Warehouse.findOne({ where: { code } });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'A warehouse with this code already exists'
                });
            }
        }

        const warehouse = await Warehouse.create({
            name, code, address, county, town, landmark,
            contactPerson, contactPhone, contactEmail,
            capacity, operatingHours, isActive, notes
        });

        res.status(201).json({ success: true, warehouse });
    } catch (error) {
        console.error('Error creating warehouse:', error);
        res.status(500).json({ success: false, message: 'Failed to create warehouse', error: error.message });
    }
};

// PUT /api/warehouses/:id - Update warehouse (Admin only)
exports.updateWarehouse = async (req, res) => {
    try {
        const warehouse = await Warehouse.findByPk(req.params.id);

        if (!warehouse) {
            return res.status(404).json({ success: false, message: 'Warehouse not found' });
        }

        const {
            name, code, address, county, town, landmark,
            contactPerson, contactPhone, contactEmail,
            capacity, operatingHours, isActive, notes
        } = req.body;

        // Check for duplicate code if changing
        if (code && code !== warehouse.code) {
            const existing = await Warehouse.findOne({ where: { code } });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'A warehouse with this code already exists'
                });
            }
        }

        await warehouse.update({
            name, code, address, county, town, landmark,
            contactPerson, contactPhone, contactEmail,
            capacity, operatingHours, isActive, notes
        });

        res.json({ success: true, warehouse });
    } catch (error) {
        console.error('Error updating warehouse:', error);
        res.status(500).json({ success: false, message: 'Failed to update warehouse', error: error.message });
    }
};

// DELETE /api/warehouses/:id - Delete warehouse (Admin only - Soft Delete)
exports.deleteWarehouse = async (req, res) => {
    try {
        const warehouse = await Warehouse.findByPk(req.params.id);

        if (!warehouse) {
            return res.status(404).json({ success: false, message: 'Warehouse not found' });
        }

        // Soft delete by setting isActive to false
        await warehouse.update({ isActive: false });

        res.json({ success: true, message: 'Warehouse deactivated successfully' });
    } catch (error) {
        console.error('Error deleting warehouse:', error);
        res.status(500).json({ success: false, message: 'Failed to delete warehouse', error: error.message });
    }
};

// DELETE /api/warehouses/hard/:id - Permanently delete warehouse (Admin only)
exports.hardDeleteWarehouse = async (req, res) => {
    try {
        const { password } = req.body;
        const { Order } = require('../models');

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

        const warehouse = await Warehouse.findByPk(req.params.id);

        if (!warehouse) {
            return res.status(404).json({ success: false, message: 'Warehouse not found' });
        }

        // Check for dependencies (Orders)
        const orderCount = await Order.count({ where: { warehouseId: warehouse.id } });
        if (orderCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot permanently delete warehouse. It is linked to ${orderCount} orders. Deactivate it instead.`
            });
        }

        await warehouse.destroy();
        res.json({ success: true, message: 'Warehouse permanently deleted successfully' });
    } catch (error) {
        console.error('Error hard deleting warehouse:', error);
        res.status(500).json({ success: false, message: 'Failed to delete warehouse', error: error.message });
    }
};

// PATCH /api/warehouses/:id/activate - Activate warehouse
exports.activateWarehouse = async (req, res) => {
    try {
        const warehouse = await Warehouse.findByPk(req.params.id);
        if (!warehouse) {
            return res.status(404).json({ success: false, message: 'Warehouse not found' });
        }
        await warehouse.update({ isActive: true });
        res.json({ success: true, message: 'Warehouse activated successfully', warehouse });
    } catch (error) {
        console.error('Activate warehouse error:', error);
        res.status(500).json({ success: false, message: 'Failed to activate warehouse' });
    }
};
