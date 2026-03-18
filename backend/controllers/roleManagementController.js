const { User, Role } = require('../models');
const bcrypt = require('bcryptjs');

// Get all available roles
const getRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({
      order: [['name', 'ASC']]
    });

    // Add user counts to each role
    const rolesWithCounts = await Promise.all(roles.map(async (role) => {
      const count = await User.count({ where: { role: role.id } });
      return {
        ...role.toJSON(),
        count
      };
    }));

    res.json(rolesWithCounts);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({
      message: 'Server error while fetching roles',
      error: error.message
    });
  }
};

// Create a new role
const createRole = async (req, res) => {
  try {
    const { id, name, description, accessLevels, permissions } = req.body;
    const adminPassword = req.headers['x-admin-password'];

    if (!id || !name) {
      return res.status(400).json({ message: 'Role ID (slug) and Name are required' });
    }

    // Check if user is super admin
    const requestingUser = await User.findByPk(req.user.id);
    if (!requestingUser || requestingUser.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied. Super admin role required.' });
    }

    // Verify admin password
    if (!adminPassword) {
      return res.status(400).json({ message: 'Admin password is required' });
    }

    const isMatch = await bcrypt.compare(adminPassword, requestingUser.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid admin password' });
    }

    // Check if role already exists
    const existingRole = await Role.findByPk(id.toLowerCase());
    if (existingRole) {
      return res.status(400).json({ message: 'Role already exists' });
    }

    const newRole = await Role.create({
      id: id.toLowerCase(),
      name,
      description,
      accessLevels: accessLevels || {},
      permissions: permissions || [],
      isSystem: false
    });

    res.status(201).json({
      ...newRole.toJSON(),
      message: 'Role created successfully'
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({
      message: 'Server error while creating role',
      error: error.message
    });
  }
};

// Update a role
const updateRole = async (req, res) => {
  try {
    const { name, description, accessLevels, permissions } = req.body;
    const { id } = req.params;
    const adminPassword = req.headers['x-admin-password'];

    // Check if user is super admin
    const requestingUser = await User.findByPk(req.user.id);
    if (!requestingUser || requestingUser.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied. Super admin role required.' });
    }

    // Verify admin password
    if (!adminPassword) {
      return res.status(400).json({ message: 'Admin password is required' });
    }

    const isMatch = await bcrypt.compare(adminPassword, requestingUser.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid admin password' });
    }

    const role = await Role.findByPk(id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Update role
    await role.update({
      name: name || role.name,
      description: description || role.description,
      accessLevels: accessLevels || role.accessLevels,
      permissions: permissions || role.permissions
    });

    // If accessLevels changed, we might want to update all users with this role
    // This could be a background task in a real production environment
    if (accessLevels) {
      await User.update(
        { accessRestrictions: accessLevels },
        { where: { role: id } }
      );
    }

    res.json({
      ...role.toJSON(),
      message: 'Role updated successfully'
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({
      message: 'Server error while updating role',
      error: error.message
    });
  }
};

// Delete a role
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const adminPassword = req.headers['x-admin-password'];

    // Check if user is super admin
    const requestingUser = await User.findByPk(req.user.id);
    if (!requestingUser || requestingUser.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied. Super admin role required.' });
    }

    // Verify admin password
    if (!adminPassword) {
      return res.status(400).json({ message: 'Admin password is required' });
    }

    const isMatch = await bcrypt.compare(adminPassword, requestingUser.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid admin password' });
    }

    const role = await Role.findByPk(id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    if (role.isSystem) {
      return res.status(400).json({ message: 'Cannot delete system roles' });
    }

    // Check if any users have this role
    const userCount = await User.count({ where: { role: id } });
    if (userCount > 0) {
      return res.status(400).json({
        message: `Cannot delete role '${id}' because ${userCount} user(s) currently have this role. Please reassign users first.`
      });
    }

    await role.destroy();

    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({
      message: 'Server error while deleting role',
      error: error.message
    });
  }
};

module.exports = {
  getRoles,
  createRole,
  updateRole,
  deleteRole
};
