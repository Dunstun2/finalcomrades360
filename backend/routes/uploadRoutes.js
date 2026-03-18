const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { compressUploadedImages } = require('../utils/imageCompression');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../uploads")),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage });

const router = express.Router();
router.post("/", upload.single("file"), compressUploadedImages, (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  const url = "/uploads/" + req.file.filename;
  res.json({ url });
});

router.post("/multiple", upload.array("files", 10), compressUploadedImages, (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: "No files uploaded" });
  const urls = req.files.map(file => "/uploads/" + file.filename);
  res.json({ urls });
});

module.exports = router;
