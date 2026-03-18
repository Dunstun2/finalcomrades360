const { JobOpening, RoleApplication, User, sequelize } = require('../models');
const { Op } = require('sequelize');

const createJobOpening = async (req, res) => {
    try {
        const { role, title, description, requirements, targetCount, deadline, adminId } = req.body;

        if (!role || !title || !description || !targetCount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: role, title, description, and targetCount are required.'
            });
        }

        const jobOpening = await JobOpening.create({
            role,
            title,
            description,
            requirements,
            targetCount,
            deadline,
            createdBy: adminId,
            status: 'active'
        });

        res.status(201).json({
            success: true,
            message: 'Job opening created successfully',
            data: jobOpening
        });
    } catch (error) {
        console.error('Error creating job opening:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create job opening',
            error: error.message
        });
    }
};

const getJobOpenings = async (req, res) => {
    try {
        const { status, role } = req.query;
        const whereClause = {};
        if (status) whereClause.status = status;
        if (role) whereClause.role = role;

        console.log('[DEBUG] Fetching job openings with where:', whereClause);

        const openings = await JobOpening.findAll({
            where: whereClause,
            include: [
                {
                    model: RoleApplication,
                    as: 'applications',
                    attributes: ['id', 'status'],
                    required: false
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        console.log(`[DEBUG] Found ${openings.length} openings`);

        // Add applicant counts (approved vs total)
        const formattedOpenings = openings.map(opening => {
            const plain = opening.get({ plain: true });
            const applications = plain.applications || [];
            plain.approvedCount = applications.filter(app => app.status === 'approved').length;
            plain.totalApplications = applications.length;
            return plain;
        });

        res.json({
            success: true,
            data: formattedOpenings
        });
    } catch (error) {
        console.error('Error fetching job openings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch job openings',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

const updateJobOpening = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, requirements, targetCount, deadline, status } = req.body;

        const jobOpening = await JobOpening.findByPk(id);
        if (!jobOpening) {
            return res.status(404).json({ success: false, message: 'Job opening not found' });
        }

        await jobOpening.update({
            title: title || jobOpening.title,
            description: description || jobOpening.description,
            requirements: requirements || jobOpening.requirements,
            targetCount: targetCount || jobOpening.targetCount,
            deadline: deadline || jobOpening.deadline,
            status: status || jobOpening.status
        });

        res.json({
            success: true,
            message: 'Job opening updated successfully',
            data: jobOpening
        });
    } catch (error) {
        console.error('Error updating job opening:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update job opening',
            error: error.message
        });
    }
};

const deleteJobOpening = async (req, res) => {
    try {
        const { id } = req.params;
        const jobOpening = await JobOpening.findByPk(id);

        if (!jobOpening) {
            return res.status(404).json({ success: false, message: 'Job opening not found' });
        }

        // Check if there are applications
        const applicationCount = await RoleApplication.count({ where: { jobOpeningId: id } });
        if (applicationCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete job opening with existing applications. Consider closing it instead.'
            });
        }

        await jobOpening.destroy();
        res.json({ success: true, message: 'Job opening deleted successfully' });
    } catch (error) {
        console.error('Error deleting job opening:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete job opening',
            error: error.message
        });
    }
};

module.exports = {
    createJobOpening,
    getJobOpenings,
    updateJobOpening,
    deleteJobOpening
};
