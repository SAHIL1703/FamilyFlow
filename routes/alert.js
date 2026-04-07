const express = require('express');
const { getAlertHistory } = require("../controllers/alertController.js");
const protect = require('../middleware/authMiddleware.js'); // Use your existing auth middleware

const router = express.Router();

// GET /api/alerts/history -> Returns the user's past alerts
router.get('/history', protect, getAlertHistory);

module.exports = router;