const { User, RoleApplication, Notification } = require("../models");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

// Ensure upload directory exists
const idsDir = 'uploads/ids';
try { fs.mkdirSync(idsDir, { recursive: true }); } catch { }

// Configure multer for ID uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, idsDir + '/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const applyForRole = async (req, res) => {
  try {
    const { role, university, studentId, reason, isStudent } = req.body;
    const userId = req.user.id;

    if (!['marketer', 'seller', 'delivery_agent', 'service_provider'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.role !== 'customer') {
      return res.status(400).json({ error: 'Only customers can apply for additional roles' });
    }

    if (user.applicationStatus === 'pending') {
      return res.status(400).json({ error: 'You already have a pending application' });
    }

    // National ID files are no longer required for role applications
    const files = req.files || {};
    // const nFront = files.nationalIdFront?.[0];
    // const nBack = files.nationalIdBack?.[0];
    // if (!nFront || !nBack) {
    //   return res.status(400).json({ error: 'Both front and back of the National ID are required' });
    // }


    const studentFlag = String(isStudent).toLowerCase() === 'true';
    if (studentFlag) {
      if (!university || !studentId) {
        return res.status(400).json({ error: 'University and Student ID are required when isStudent flag is true' });
      }
      // Student ID images are OPTIONAL now; if provided, they will be saved below
    }

    // Parse referees if provided
    let parsedReferees = [];
    if (req.body.referees) {
      try {
        parsedReferees = typeof req.body.referees === 'string' ? JSON.parse(req.body.referees) : req.body.referees;
        if (!Array.isArray(parsedReferees)) {
          parsedReferees = [];
        }
      } catch (e) {
        console.log('📋 Invalid referees format:', req.body.referees);
        parsedReferees = [];
      }
    }

    // Create application (with referees field)
    const application = await RoleApplication.create({
      userId,
      appliedRole: role,
      nationalIdFrontUrl: files.nationalIdFront?.[0]?.path || null,
      nationalIdBackUrl: files.nationalIdBack?.[0]?.path || null,
      studentIdFrontUrl: files.studentIdFront?.[0]?.path || null,
      studentIdBackUrl: files.studentIdBack?.[0]?.path || null,
      university: studentFlag ? university : university || '',
      studentId: studentFlag ? studentId : studentId || '',
      reason,
      referees: parsedReferees
    });

    // Update user status
    await user.update({
      applicationStatus: 'pending',
      appliedRole: role,
      university: studentFlag ? university : null,
      studentId: studentFlag ? studentId : null,
      nationalIdUrl: nFront.path
    });

    res.json({ message: 'Application submitted successfully', applicationId: application.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get pending applications (admin only)
const getPendingApplications = async (req, res) => {
  try {
    const applications = await RoleApplication.findAll({
      where: { status: 'pending' },
      include: [{
        model: User,
        attributes: ['id', 'name', 'email', 'phone', 'publicId']
      }],
      order: [['createdAt', 'ASC']]
    });

    // Add referees to the response
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
        user: app.user ? app.user.get({ plain: true }) : null
      };
    });

    res.json(formattedResults);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Approve/reject application (admin only)
const reviewApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status, adminNotes } = req.body;
    const adminId = req.user.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    let notes = adminNotes?.trim();
    if (status === 'rejected' && !notes) {
      notes = 'Application rejected.';
    }

    const application = await RoleApplication.findByPk(applicationId, {
      include: [User]
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Update application
    await application.update({
      status,
      adminNotes: notes,
      reviewedBy: adminId,
      reviewedAt: new Date()
    });

    // Update user if approved
    if (status === 'approved') {
      const user = application.User;
      let currentRoles = user.roles || ['customer'];
      if (!Array.isArray(currentRoles)) {
        currentRoles = [user.role || 'customer'];
      }

      if (!currentRoles.includes(application.appliedRole)) {
        currentRoles = [...currentRoles, application.appliedRole];
      }

      await user.update({
        role: application.appliedRole,
        roles: currentRoles,
        applicationStatus: 'approved',
        isVerified: true
      });
      // Notify applicant
      try {
        await Notification.create({
          userId: application.userId,
          title: 'Role Application Approved',
          message: `Your application for ${application.appliedRole} has been approved. Welcome aboard!`
        });
      } catch { }
    } else {
      await application.User.update({
        applicationStatus: 'rejected'
      });
      // Notify applicant with reason
      try {
        await Notification.create({
          userId: application.userId,
          title: 'Role Application Rejected',
          message: notes || 'Your application has been rejected.'
        });
      } catch { }
    }

    res.json({ message: `Application ${status} successfully` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Expect multiple fields for files
const uploadMiddleware = upload.fields([
  { name: 'nationalIdFront', maxCount: 1 },
  { name: 'nationalIdBack', maxCount: 1 },
  { name: 'studentIdFront', maxCount: 1 },
  { name: 'studentIdBack', maxCount: 1 }
]);

module.exports = {
  applyForRole,
  getPendingApplications,
  reviewApplication,
  uploadMiddleware
};
