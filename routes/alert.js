const express = require('express');
const { getAlertHistory, getRecentRoomAlerts } = require("../controllers/alertController.js");
const protect = require('../middleware/authMiddleware.js'); // Use your existing auth middleware

const router = express.Router();

// GET /api/alerts/history -> Returns the user's past alerts
router.get('/history', protect, getAlertHistory);

// GET /api/alerts/room/:roomId -> Returns recent alerts (last 5 min) for all members in a room
router.get('/room/:roomId', protect, getRecentRoomAlerts);

module.exports = router;