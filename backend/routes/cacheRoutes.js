const express = require('express');
const router = express.Router();
const cacheService = require('../scripts/services/cacheService');

// Cache statistics endpoint
router.get('/stats', async (req, res) => {
  try {
    const stats = await cacheService.stats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    res.status(500).json({
      message: 'Failed to fetch cache statistics',
      error: error.message
    });
  }
});

// Clear cache endpoint (for testing)
router.delete('/clear', async (req, res) => {
  try {
    await cacheService.flush();
    res.json({ message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      message: 'Failed to clear cache',
      error: error.message
    });
  }
});

module.exports = router;