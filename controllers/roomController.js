const mongoose = require("mongoose");
const Room = require("./../models/Room.js");

// ---------------------
// CREATE ROOM
// ---------------------
exports.createRoom = async (req, res) => {
  try {
    const { roomName } = req.body;
    const createdBy = req.user.id;

    if (!roomName || !roomName.trim()) {
      return res.status(400).json({ success: false, message: "Room name is required" });
    }

    const room = await Room.create({
      roomName: roomName.trim(),
      createdBy,
      members: [createdBy]
    });

    return res.status(201).json({ success: true, room });

  } catch (error) {
    console.error("Create Room Error:", error);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};



// ---------------------
// GET ALL ROOMS OF USER
// ---------------------
exports.getRooms = async (req, res) => {
  try {
    const userId = req.user.id;

    const rooms = await Room.find({ members: userId })
      .populate("createdBy", "username email")
      .populate("members", "username email");

    return res.status(200).json({ success: true, rooms });

  } catch (error) {
    console.error("Get Rooms Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};



// ---------------------
// DELETE ROOM
// ---------------------
exports.deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ success: false, message: "Invalid Room ID" });
    }

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    if (room.createdBy.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    await Room.findByIdAndDelete(roomId);

    return res.status(200).json({ success: true, message: "Room deleted successfully" });

  } catch (error) {
    console.error("Delete Room Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};



// ---------------------
// UPDATE ROOM
// ---------------------
exports.updateRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { roomName } = req.body;
    const userId = req.user.id;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ success: false, message: "Invalid Room ID" });
    }

    if (!roomName || !roomName.trim()) {
      return res.status(400).json({ success: false, message: "Room name is required" });
    }

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    if (room.createdBy.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    room.roomName = roomName.trim();
    await room.save();

    return res.status(200).json({ success: true, room });

  } catch (error) {
    console.error("Update Room Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
