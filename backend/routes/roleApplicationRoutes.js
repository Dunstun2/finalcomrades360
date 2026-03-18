const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const {
  saveDraftApplication,
  createRoleApplication,
  getRoleApplications,
  getRoleApplicationById,
  updateRoleApplicationStatus,
  getUserRoleApplications,
  getUserDraft
} = require('../controllers/roleApplicationController');
const { uploadIDDocuments } = require('../config/multer');
const { compressUploadedImages } = require('../utils/imageCompression');

// Enhanced file upload error handler
const handleFileUploadError = (err, req, res, next) => {
  console.log('[Role Application] File upload error:', err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum file size is 10MB per file. Please compress your images and try again.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded. Maximum 4 files allowed (front and back of both IDs).'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field. Only studentIdFront and studentIdBack are allowed.'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'File upload error: ' + err.message
    });
  } else if (err) {
    return res.status(500).json({
      success: false,
      message: 'An error occurred during file upload: ' + err.message
    });
  }
  next();
};

// Define upload fields
const uploadFields = [
  { name: 'studentIdFront', maxCount: 1 },
  { name: 'studentIdBack', maxCount: 1 }
];


// Save draft application
router.post(
  '/draft',
  authenticate,
  uploadIDDocuments.fields(uploadFields),
  compressUploadedImages,
  handleFileUploadError,
  saveDraftApplication
);

// Get user's draft
router.get(
  '/draft/:userId',
  authenticate,
  getUserDraft
);

// Apply for a role (submit application)
router.post(
  '/',
  authenticate,
  uploadIDDocuments.fields(uploadFields),
  compressUploadedImages,
  handleFileUploadError,
  createRoleApplication
);

// Get all applications (admin only)
router.get(
  '/',
  authenticate,
  authorize(['admin', 'super_admin']),
  getRoleApplications
);

// Get application by ID
router.get(
  '/:id',
  authenticate,
  getRoleApplicationById
);

// Update application status (admin only)
router.put(
  '/:id/status',
  authenticate,
  authorize(['admin', 'super_admin']),
  updateRoleApplicationStatus
);

// Get current user's applications
router.get(
  '/user/:userId',
  authenticate,
  getUserRoleApplications
);

module.exports = router;
