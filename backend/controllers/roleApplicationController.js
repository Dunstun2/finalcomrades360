const { RoleApplication, User, Notification, JobOpening, sequelize } = require('../models');
const { Op } = require('sequelize');
const { normalizeKenyanPhone } = require('../middleware/validators');
const { getIO } = require('../realtime/socket');

// Helper function to handle file uploads
const handleFileUpload = (file, path) => {
  if (!file) return null;
  // Remove the 'uploads' prefix from the path since we're serving from /uploads
  const normalizedPath = file.path.replace(/\\/g, '/');
  return normalizedPath.split('uploads/')[1];
};

const saveDraftApplication = async (req, res) => {
  try {
    const { userId, appliedRole, reason, university, studentId, referees, jobOpeningId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required.'
      });
    }

    // Check if user is verified
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if user already has this role
    const userRoles = user.roles || ['customer'];
    const normalizedAppliedRole = (appliedRole || 'seller').toLowerCase().replace(/ /g, '_');
    if (userRoles.includes(normalizedAppliedRole)) {
      console.log('❌ saveDraft: User already has role:', normalizedAppliedRole);
      return res.status(400).json({
        success: false,
        message: 'You already have this role. You cannot apply for a role you currently hold.'
      });
    }

    // Check if user already has a pending application for this role
    const existingApplication = await RoleApplication.findOne({
      where: {
        userId,
        appliedRole: normalizedAppliedRole,
        status: 'pending'
      }
    });

    if (existingApplication) {
      console.log('❌ saveDraft: Pending application exists for role:', normalizedAppliedRole);
      return res.status(400).json({
        success: false,
        message: 'You already have a pending application for this role. You cannot create a new draft until it is reviewed.'
      });
    }

    const isAdmin = ['admin', 'superadmin', 'super_admin'].includes(user.role);
    if (!isAdmin && !user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Account verification required. Please complete your profile and ID verification first.'
      });
    }

    // Handle referees data (new individual fields or old JSON format)
    let parsedReferees = [];

    // Check for new individual referee fields first
    if (req.body.referee1Name && req.body.referee1Phone && req.body.referee2Name && req.body.referee2Phone) {
      parsedReferees = [
        { name: req.body.referee1Name.trim(), contact: normalizeKenyanPhone(req.body.referee1Phone) || req.body.referee1Phone.trim() },
        { name: req.body.referee2Name.trim(), contact: normalizeKenyanPhone(req.body.referee2Phone) || req.body.referee2Phone.trim() }
      ];
    } else if (referees) {
      // Fall back to old JSON format
      try {
        const raw = typeof referees === 'string' ? JSON.parse(referees) : referees;
        if (Array.isArray(raw)) {
          parsedReferees = raw.map(r => ({
            name: r.name ? String(r.name).trim() : '',
            contact: normalizeKenyanPhone(r.phone || r.contact) || String(r.phone || r.contact || '').trim()
          }));
        }
      } catch (error) {
        console.log('📋 Invalid referees format in draft:', referees);
        parsedReferees = [];
      }
    }

    // Check if user already has a draft for this role
    let existingDraft = await RoleApplication.findOne({
      where: {
        userId,
        appliedRole: normalizedAppliedRole,
        status: 'draft'
      }
    });

    // Handle file uploads


    let studentIdFrontUrl = null;
    let studentIdBackUrl = null;

    if (req.files?.['studentIdFront']?.[0]) {
      studentIdFrontUrl = handleFileUpload(req.files['studentIdFront'][0], 'student-ids');
    }

    if (req.files?.['studentIdBack']?.[0]) {
      studentIdBackUrl = handleFileUpload(req.files['studentIdBack'][0], 'student-ids');
    }

    const applicationData = {
      userId,
      appliedRole: normalizedAppliedRole,
      reason: reason || null,
      university: university || null,
      studentId: studentId || null,
      referees: parsedReferees,
      jobOpeningId: jobOpeningId || null,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'draft'
    };


    if (studentIdFrontUrl) applicationData.studentIdFrontUrl = studentIdFrontUrl;
    if (studentIdBackUrl) applicationData.studentIdBackUrl = studentIdBackUrl;

    let application;
    if (existingDraft) {
      // Update existing draft
      await existingDraft.update(applicationData);
      application = existingDraft;
    } else {
      // Create new draft
      application = await RoleApplication.create(applicationData);
    }

    res.status(200).json({
      success: true,
      message: 'Draft saved successfully',
      data: application
    });
  } catch (error) {
    console.error('Error saving draft application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save draft',
      error: error.message
    });
  }
};

const createRoleApplication = async (req, res) => {
  try {
    const { userId, appliedRole, reason, university, studentId, referees } = req.body;
    console.log('📝 createRoleApplication Request Body:', JSON.stringify(req.body, null, 2));
    console.log('📂 createRoleApplication Files:', req.files ? Object.keys(req.files) : 'No files');

    if (!userId || !appliedRole) {
      return res.status(400).json({
        success: false,
        message: 'User ID and applied role are required.'
      });
    }

    // Check if user is verified
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if user already has this role
    const userRoles = user.roles || ['customer'];
    const normalizedAppliedRole = appliedRole.toLowerCase().replace(/ /g, '_');
    if (userRoles.includes(normalizedAppliedRole)) {
      console.log('❌ createRoleApplication: User already has role:', normalizedAppliedRole);
      return res.status(400).json({
        success: false,
        message: 'You already have this role. You cannot apply for a role you currently hold.'
      });
    }

    const isAdmin = ['admin', 'superadmin', 'super_admin'].includes(user.role);
    if (!isAdmin && !user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Account verification required. Please complete your profile and ID verification first.'
      });
    }

    // Check if user already has a pending application for this role
    const existingApplication = await RoleApplication.findOne({
      where: {
        userId,
        appliedRole: normalizedAppliedRole,
        status: 'pending'
      }
    });

    if (existingApplication) {
      console.log('❌ Pending application exists');
      return res.status(400).json({
        success: false,
        message: 'You already have a pending application for this role.'
      });
    }

    // --- JOB OPENING VALIDATION START ---
    const { jobOpeningId } = req.body;
    if (!jobOpeningId) {
      console.warn('⚠️ createRoleApplication: jobOpeningId is missing in request body');
      return res.status(400).json({
        success: false,
        message: 'A valid Job Opening ID is required to apply for a role.'
      });
    }

    const jobOpening = await JobOpening.findByPk(jobOpeningId, {
      include: [{ model: RoleApplication, as: 'applications', where: { status: 'approved' }, required: false }]
    });

    if (!jobOpening) {
      return res.status(404).json({ success: false, message: 'Job opening not found.' });
    }

    if (jobOpening.status !== 'active') {
      return res.status(400).json({ success: false, message: 'This job opening is no longer active.' });
    }

    if (jobOpening.role !== normalizedAppliedRole) {
      return res.status(400).json({
        success: false,
        message: `This job opening is for ${jobOpening.role}, but you are applying for ${normalizedAppliedRole}.`
      });
    }

    if (jobOpening.deadline && new Date(jobOpening.deadline) < new Date()) {
      return res.status(400).json({ success: false, message: 'The deadline for this job opening has passed.' });
    }

    const approvedCount = jobOpening.applications ? jobOpening.applications.length : 0;
    if (approvedCount >= jobOpening.targetCount) {
      return res.status(400).json({ success: false, message: 'This job opening has already been filled.' });
    }
    // --- JOB OPENING VALIDATION END ---

    // Handle file uploads


    // Only process student ID files if they exist
    let studentIdFrontUrl = null;
    let studentIdBackUrl = null;

    if (req.files?.['studentIdFront']?.[0]) {
      studentIdFrontUrl = handleFileUpload(req.files['studentIdFront'][0], 'student-ids');
    }

    if (req.files?.['studentIdBack']?.[0]) {
      studentIdBackUrl = handleFileUpload(req.files['studentIdBack'][0], 'student-ids');
    }



    if (!reason) {
      console.log('❌ Missing reason');
      return res.status(400).json({
        success: false,
        message: 'Please provide a reason for your application.'
      });
    }

    // Handle referees (validate and standardize) - MUST be before draft check
    let parsedReferees = [];
    if (referees) {
      try {
        const raw = typeof referees === 'string' ? JSON.parse(referees) : referees;
        if (!Array.isArray(raw)) {
          return res.status(400).json({ success: false, message: 'Referees must be an array' });
        }

        parsedReferees = raw.map(r => {
          const phone = r.phone || r.contact;
          const normalized = normalizeKenyanPhone(phone);
          if (!normalized) {
            console.log('❌ createRoleApplication: Invalid referee phone:', phone);
            throw new Error(`Invalid phone number for referee ${r.name || ''}: ${phone}. Use 01... or 07... (10 digits) or +254... (13 digits).`);
          }
          return {
            name: String(r.name || '').trim(),
            contact: normalized
          };
        });

        if (parsedReferees.length < 2) {
          return res.status(400).json({ success: false, message: 'Please provide at least 2 referees.' });
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message || 'Invalid referees format'
        });
      }
    } else {
      console.log('❌ Referees missing');
      return res.status(400).json({ success: false, message: 'Referee details are required.' });
    }

    // Check if there's an existing draft to update
    const existingDraft = await RoleApplication.findOne({
      where: {
        userId,
        appliedRole: normalizedAppliedRole,
        status: 'draft'
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id']
      }]
    });

    let application;
    if (existingDraft) {
      // Update existing draft to pending
      await existingDraft.update({
        reason,
        university: university || null,
        studentId: studentId || null,
        jobOpeningId,
        studentIdFrontUrl,
        studentIdBackUrl,
        referees: parsedReferees,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'pending'
      });

      // Also update the user's applicationStatus
      if (existingDraft.user) {
        await existingDraft.user.update({ applicationStatus: 'pending' });
      }

      application = existingDraft;
    } else {
      application = await RoleApplication.create({
        userId,
        appliedRole: normalizedAppliedRole,
        reason,
        university: university || null,
        studentId: studentId || null,
        jobOpeningId,
        studentIdFrontUrl,
        studentIdBackUrl,
        referees: parsedReferees,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'pending'
      }, {
        include: [{
          model: User,
          as: 'user',
          attributes: ['id']
        }]
      });

      // Also update the user's applicationStatus
      if (application.user) {
        await application.user.update({ applicationStatus: 'pending' });
      }
    }

    // --- NOTIFICATION START ---
    try {
      // Find all Super Admins to notify
      const superAdmins = await User.findAll({
        where: {
          role: { [Op.in]: ['superadmin', 'super_admin'] }
        },
        attributes: ['id']
      });

      const applicant = await User.findByPk(userId);
      const roleName = appliedRole.charAt(0).toUpperCase() + appliedRole.slice(1).replace(/_/g, ' ');

      if (superAdmins && superAdmins.length > 0) {
        const notifications = superAdmins.map(admin => ({
          userId: admin.id,
          title: 'New Role Application',
          message: `${applicant?.name || 'A user'} has applied for the ${roleName} role and is awaiting review.`
        }));

        await Notification.bulkCreate(notifications);
        console.log(`[Notification] Notified ${superAdmins.length} Super Admins about new application from ${userId}`);
      }
    } catch (notifErr) {
      console.error('[Notification] Error sending submission notifications:', notifErr);
      // Don't fail the request if notification fails
    }
    // --- NOTIFICATION END ---

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: application
    });
  } catch (error) {
    console.error('Error creating role application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application',
      error: error.message
    });
  }
};

const getRoleApplications = async (req, res) => {
  try {
    console.log('getRoleApplications called with query:', req.query);
    const { status = 'pending', role } = req.query; // Default to 'pending' status if not specified

    // Build the where clause
    const whereClause = {};
    if (status) whereClause.status = status;
    if (role) whereClause.appliedRole = role;

    console.log('Query conditions:', JSON.stringify(whereClause, null, 2));

    // First, check if there are any role applications in the database
    const count = await RoleApplication.count();
    console.log(`Total role applications in database: ${count}`);

    if (count === 0) {
      console.log('No role applications found in the database');
      return res.json({
        success: true,
        data: []
      });
    }

    // Find all role applications with associated user and reviewer data
    const applications = await RoleApplication.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone', 'role']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name', 'email']
        },
        {
          model: JobOpening,
          as: 'jobOpening',
          attributes: ['id', 'title', 'role']
        }
      ],
      order: [['createdAt', 'DESC']],
      raw: false
    });

    console.log(`Found ${applications.length} applications`);

    // Convert to plain objects to handle nested data and include document URLs
    const formattedResults = applications.map(app => {
      const appData = app.get({ plain: true });
      return {
        ...appData,
        // Map database fields to frontend fields
        nationalIdFront: appData.nationalIdFrontUrl,
        nationalIdBack: appData.nationalIdBackUrl,
        studentIdFront: appData.studentIdFrontUrl,
        studentIdBack: appData.studentIdBackUrl,
        // Keep the original URL fields as well
        nationalIdFrontUrl: appData.nationalIdFrontUrl,
        nationalIdBackUrl: appData.nationalIdBackUrl,
        studentIdFrontUrl: appData.studentIdFrontUrl,
        studentIdBackUrl: appData.studentIdBackUrl,
        referees: appData.referees || [],
        user: app.user ? app.user.get({ plain: true }) : null,
        reviewer: app.reviewer ? app.reviewer.get({ plain: true }) : null
      };
    });

    console.log('Formatted results:', JSON.stringify(formattedResults, null, 2));

    res.json({
      success: true,
      data: formattedResults
    });
  } catch (error) {
    console.error('Error in getRoleApplications:', error);
    console.error('Error stack:', error.stack);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};
const updateRoleApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, adminId } = req.body;

    // Validate status
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: approved, rejected, pending'
      });
    }

    // Find the application
    const application = await RoleApplication.findByPk(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Update application status
    application.status = status;
    application.adminNotes = adminNotes;
    application.reviewedBy = adminId;
    application.reviewedAt = new Date();

    await application.save();

    // If approved, update user role and verification status
    if (status === 'approved') {
      const user = await User.findByPk(application.userId);
      if (user) {
        // Update the user's roles array (multiple roles support)
        let currentRoles = user.roles || ['customer'];
        if (!Array.isArray(currentRoles)) {
          // Fallback if roles is not yet an array
          currentRoles = [user.role || 'customer'];
        }

        // Add new role if not already present
        const updatedRoles = [...new Set([...currentRoles, application.appliedRole])];

        user.roles = updatedRoles;
        // Update the user's primary role to the applied role (for backward compatibility)
        user.role = application.appliedRole;
        user.applicationStatus = 'approved';
        user.isVerified = true; // Mark as verified when role application is approved
        await user.save();
      }
    }

    // --- NOTIFICATION START ---
    try {
      const roleName = application.appliedRole.charAt(0).toUpperCase() + application.appliedRole.slice(1).replace(/_/g, ' ');
      const statusText = status === 'approved' ? 'Approved' : 'Rejected';

      let message = `Your application for the ${roleName} role has been ${status}.`;
      if (status === 'rejected' && adminNotes) {
        message += ` Reason: ${adminNotes}`;
      } else if (adminNotes) {
        message += ` Admin Notes: ${adminNotes}`;
      }

      await Notification.create({
        userId: application.userId,
        title: `Role Application ${statusText}`,
        message: message
      });

      const io = getIO();
      if (io) {
        // Fetch the created notification to emit it (or construct payload)
        // We can just emit the message payload directly for simplicity and speed
        io.to(`user:${application.userId}`).emit('notification:new', {
          userId: application.userId,
          title: `Role Application ${statusText}`,
          message: message,
          type: 'role_application_update',
          createdAt: new Date()
        });
      }

      console.log(`[Notification] Notified user ${application.userId} about application ${status}`);
    } catch (notifErr) {
      console.error('[Notification] Error sending status update notification:', notifErr);
    }
    // --- NOTIFICATION END ---

    res.json({
      success: true,
      message: 'Application status updated',
      data: application
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update application status',
      error: error.message
    });
  }
};

const getUserDraft = async (req, res) => {
  try {
    const { userId } = req.params;
    const { appliedRole } = req.query;

    const draft = await RoleApplication.findOne({
      where: {
        userId,
        appliedRole: appliedRole || 'seller',
        status: 'draft'
      }
    });

    res.json({
      success: true,
      data: draft
    });
  } catch (error) {
    console.error('Error fetching user draft:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch draft',
      error: error.message
    });
  }
};

const getUserRoleApplications = async (req, res) => {
  try {
    const { userId } = req.params;

    const applications = await RoleApplication.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name', 'email']
        },
        {
          model: JobOpening,
          as: 'jobOpening',
          attributes: ['id', 'title', 'role']
        }
      ]
    });

    // Convert to plain objects and map document fields for frontend compatibility
    const formattedResults = applications.map(app => {
      const appData = app.get({ plain: true });
      return {
        ...appData,
        // Map database fields to frontend fields
        nationalIdFront: appData.nationalIdFrontUrl,
        nationalIdBack: appData.nationalIdBackUrl,
        studentIdFront: appData.studentIdFrontUrl,
        studentIdBack: appData.studentIdBackUrl,
        // Keep the original URL fields as well
        nationalIdFrontUrl: appData.nationalIdFrontUrl,
        nationalIdBackUrl: appData.nationalIdBackUrl,
        studentIdFrontUrl: appData.studentIdFrontUrl,
        studentIdBackUrl: appData.studentIdBackUrl,
        referees: appData.referees || [],
        reviewer: app.reviewer ? app.reviewer.get({ plain: true }) : null
      };
    });

    res.json({
      success: true,
      data: formattedResults
    });
  } catch (error) {
    console.error('Error fetching user role applications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
      error: error.message
    });
  }
};

const getRoleApplicationById = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await RoleApplication.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone', 'role']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name', 'email']
        },
        {
          model: JobOpening,
          as: 'jobOpening',
          attributes: ['id', 'title', 'role']
        }
      ]
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Role application not found'
      });
    }

    const appData = application.get({ plain: true });

    res.json({
      success: true,
      data: {
        ...appData,
        // Map database fields to frontend fields
        nationalIdFront: appData.nationalIdFrontUrl,
        nationalIdBack: appData.nationalIdBackUrl,
        studentIdFront: appData.studentIdFrontUrl,
        studentIdBack: appData.studentIdBackUrl,
        // Keep the original URL fields as well
        nationalIdFrontUrl: appData.nationalIdFrontUrl,
        nationalIdBackUrl: appData.nationalIdBackUrl,
        studentIdFrontUrl: appData.studentIdFrontUrl,
        studentIdBackUrl: appData.studentIdBackUrl,
        referees: appData.referees || [],
        user: application.user ? application.user.get({ plain: true }) : null,
        reviewer: application.reviewer ? application.reviewer.get({ plain: true }) : null
      }
    });
  } catch (error) {
    console.error('Error fetching role application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch role application',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Export all controller functions
module.exports = {
  saveDraftApplication,
  createRoleApplication,
  getRoleApplications,
  getRoleApplicationById,
  updateRoleApplicationStatus,
  getUserRoleApplications,
  getUserDraft
};
