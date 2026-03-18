const express = require('express');
const { applyForRole, getPendingApplications, reviewApplication, uploadMiddleware } = require("../controllers/roleController");
const { auth, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.post("/apply", auth, uploadMiddleware, applyForRole);
router.get("/applications", auth, adminOnly, getPendingApplications);
router.put("/applications/:applicationId", auth, adminOnly, reviewApplication);

module.exports = router;
