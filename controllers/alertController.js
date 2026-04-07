const Alert = require('../models/Alert.js');
const Room = require('../models/Room.js');

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

// Fetch recent alerts (last 5 minutes) for all members in a room
exports.getRecentRoomAlerts = async (req, res) => {
    try {
        const { roomId } = req.params;
        if (!roomId) {
            return res.status(400).json({ success: false, error: "Room ID is required." });
        }

        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ success: false, error: "Room not found." });
        }

        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const memberIds = room.members.map(m => m.toString());

        const alerts = await Alert.find({
            userId: { $in: memberIds },
            detectedAt: { $gte: fiveMinutesAgo }
        }).sort({ detectedAt: -1 });

        res.status(200).json({ success: true, alerts });
    } catch (error) {
        console.error("🚨 Fetch Recent Room Alerts Error:", error);
        res.status(500).json({ success: false, error: "Failed to fetch recent alerts." });
    }
};