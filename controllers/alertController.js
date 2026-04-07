const Alert = require('../models/Alert.js');

// Fetch alert history for the logged-in user
exports.getAlertHistory = async (req, res) => {
    try {
        // Safely grab the user ID from your protect middleware
        const userId = req.user._id || req.user.userId;

        if (!userId) {
            return res.status(400).json({ success: false, error: "Unauthorized user." });
        }

        // Find all alerts belonging to this user, sorted by newest first
        const alerts = await Alert.find({ userId })
                                  .sort({ detectedAt: -1 }) // -1 means descending order
                                  .limit(50); // Let's just grab the last 50 so it loads fast

        res.status(200).json({ success: true, count: alerts.length, alerts });
    } catch (error) {
        console.error("🚨 Fetch Alerts Error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch alert history." });
    }
};