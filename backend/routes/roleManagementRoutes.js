const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const { getRoles, createRole, updateRole, deleteRole } = require('../controllers/roleManagementController');

const router = express.Router();

// All role management routes require authentication and super admin role
router.use(auth, adminOnly);

// GET /api/roles - Get all available roles
router.get('/', getRoles);

// POST /api/roles - Create a new role
router.post('/', createRole);

// PUT /api/roles/:id - Update a role
router.put('/:id', updateRole);

// DELETE /api/roles/:id - Delete a role
router.delete('/:id', deleteRole);

module.exports = router;