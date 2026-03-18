const express = require('express');
const router = express.Router();
const jobOpeningController = require('../controllers/jobOpeningController');
const { auth, adminOnly } = require('../middleware/auth');

router.get('/', jobOpeningController.getJobOpenings);
router.post('/', auth, adminOnly, jobOpeningController.createJobOpening);
router.put('/:id', auth, adminOnly, jobOpeningController.updateJobOpening);
router.delete('/:id', auth, adminOnly, jobOpeningController.deleteJobOpening);

module.exports = router;
