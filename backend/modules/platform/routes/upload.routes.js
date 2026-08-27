const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { compressUploadedImages } = require('../../../utils/imageCompression');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../../../uploads")),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});

// File filter to allow images and videos
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only images and videos are allowed.`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for videos
  }
});

const router = express.Router();

// Error handling middleware for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum file size is 100MB.' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ error: err.message || 'File upload failed' });
  }
  next();
};

router.post("/", upload.single("file"), handleMulterError, (req, res, next) => {
  // Skip compression for logo uploads (preserves PNG transparency & quality)
  if (req.query.skipCompress === '1') return next();

  // Skip compression for video files
  if (req.file && req.file.mimetype.startsWith('video/')) {
    return next();
  }

  compressUploadedImages(req, res, next);
}, (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  const url = "/uploads/" + req.file.filename;
  res.json({ url });
});

router.post("/multiple", upload.array("files", 10), compressUploadedImages, (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: "No files uploaded" });
  const urls = req.files.map(file => "/uploads/" + file.filename);
  res.json({ urls });
});

// @route   DELETE /api/upload/file
// @desc    Permanently delete a file from the uploads directory
// @access  Private (should be protected by auth in a real app, but matching existing pattern)
router.delete("/file", (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "No file URL provided" });

  try {
    // Basic security check: ensure the path is within the uploads directory
    // and doesn't contain traversal attempts
    const normalizedUrl = url.replace(/^\/+/, '');
    if (!normalizedUrl.startsWith('uploads/')) {
      return res.status(403).json({ error: "Unauthorized path" });
    }

    // Resolve absolute path (pointing to centralized backend/uploads)
    const filePath = path.join(__dirname, '../../..', normalizedUrl);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Upload] Deleted file: ${filePath}`);
      return res.json({ success: true, message: "File deleted successfully" });
    } else {
      console.warn(`[Upload] File not found for deletion: ${filePath}`);
      return res.status(404).json({ error: "File not found" });
    }
  } catch (err) {
    console.error('[Upload] Deletion error:', err);
    return res.status(500).json({ error: "Failed to delete file" });
  }
});


module.exports = router;
