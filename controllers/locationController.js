const Location = require("../models/Location");
const Room = require("../models/Room");

exports.updateLocation = async (req, res) => {
    try {
        const userId = req.user.id;
        const { latitude, longitude } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ message: "Coordinates required" });
        }

        const updateLocation = await Location.findOneAndUpdate(
            { userId },
            { latitude, longitude, updatedAt: Date.now() },
            { new: true, upsert: true }
        );

        return res.json({
            success: true,
            message: "Location Updated",
            location: updateLocation
        })

    } catch (error) {

    }
}

exports.getMyLocation = async (req, res) => {
    try {
        const location = await Location.findOne({ userId: req.user.id });
        if (!location) {
            return res.status(404).json({ success: false, message: "No Location Found" });
        }
        return res.json({ success: true, location });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

exports.getRoomMembersLocation = async (req, res) => {
    try {
        const { roomId } = req.params;

        const room = await Room.findById(roomId).populate("members", "_id username email");
        if (!room) {
            return res.status(404).json({ success: false, message: "Room Not Found" })
        }

        const memberIds = room.members.map(member => member._id);

        const locations = await Location.find({
            userId: { $in: memberIds }
        }).populate("userId", "username email");

        return res.json({
            success: true,
            locations
        });

    } catch (error) {
        return res.status(500).json({success : false , message : error.message})
    }
}