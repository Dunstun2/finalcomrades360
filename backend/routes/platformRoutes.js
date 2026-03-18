// backend/routes/platformRoutes.js
const express = require('express');


const router = express.Router();

// Example route (you can add real ones later)
router.get("/", (req, res) => {
  res.json({ message: "Platform routes working!" });
});

module.exports = router;
