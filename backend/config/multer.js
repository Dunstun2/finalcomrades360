const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Centralized file size limits for consistency
const FILE_SIZE_LIMITS = {
  ID_DOCUMENTS: 10 * 1024 * 1024,    // 10MB for ID documents
  PRODUCT_IMAGES: 25 * 1024 * 1024,   // 25MB for product images
  PRODUCT_VIDEOS: 100 * 1024 * 1024,  // 100MB for product videos
  PROFILE_IMAGES: 5 * 1024 * 1024,    // 5MB for profile images
  SERVICE_IMAGES: 25 * 1024 * 1024,   // 25MB for service images (25MB per file, 5 files max)
  MAX_FILES: 5                        // Maximum 5 files per service
};

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = path.join(__dirname, '../uploads');
    
    // Determine the subdirectory based on file field name
    if (file.fieldname.includes('nationalId') || file.fieldname.includes('studentId')) {
      uploadPath = path.join(uploadPath, 'ids');
    } else if (file.fieldname.includes('profileImage')) {
      uploadPath = path.join(uploadPath, 'profiles');
    } else if (file.fieldname.includes('cover') || file.fieldname.includes('gallery') || file.fieldname.includes('video')) {
      uploadPath = path.join(uploadPath, 'products');
    } else if (file.fieldname.includes('service') || file.fieldname.includes('images')) {
      uploadPath = path.join(uploadPath, 'services');
    } else if (file.fieldname.includes('mainImage')) {
      uploadPath = path.join(uploadPath, 'other');
    } else {
      uploadPath = path.join(uploadPath, 'other');
    }
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter to only allow certain file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'), false);
  }
};

// File filter for product media (images and videos)
const productMediaFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/webm', 'video/quicktime'];
  const name = (file.originalname || '').toLowerCase();
  const extOk = /\.(jpg|jpeg|png|webp|heic|heif|mp4|webm|mov)$/i.test(name);
  
  if (allowedTypes.includes(file.mimetype) || extOk) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images (JPEG, PNG, WebP) and videos (MP4, WebM, MOV) are allowed.'), false);
  }
};

// File filter for service images (only images)
const serviceImageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  const name = (file.originalname || '').toLowerCase();
  const extOk = /\.(jpg|jpeg|png|webp)$/i.test(name);
  
  if (allowedTypes.includes(file.mimetype) || extOk) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
  }
};

// Create different multer configurations for different use cases
const uploadIDDocuments = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: FILE_SIZE_LIMITS.ID_DOCUMENTS,
    files: 4 // Maximum of 4 files per request
  }
});

const uploadProfileImages = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: FILE_SIZE_LIMITS.PROFILE_IMAGES,
    files: 1
  }
});

const uploadProductMedia = multer({
  storage: storage,
  fileFilter: productMediaFilter,
  limits: {
    fileSize: FILE_SIZE_LIMITS.PRODUCT_IMAGES,
    files: 7 // cover + 5 gallery + 1 video
  }
});



// Service images upload configuration
const uploadServiceImages = multer({
  storage: storage,
  fileFilter: serviceImageFilter,
  limits: {
    fileSize: FILE_SIZE_LIMITS.SERVICE_IMAGES,
    files: 5 // Maximum 5 images per service
  }
});

// Export all configurations
module.exports = {
  upload: multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024, files: 4 } }),
  uploadIDDocuments,
  uploadProfileImages,
  uploadProductMedia,

  uploadServiceImages,
  FILE_SIZE_LIMITS
};
