const mongoose = require("mongoose");
const Room = require("./../models/Room.js");
const User = require("../models/User.js");

exports.createRoom = async (req, res) => {
  try {
    const userId = req.user.id;
    const { roomName, description } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create room
    const room = await Room.create({
      roomName,
      description,
      createdBy: userId,
      members: [userId],
    });

    // Update user's created rooms
    if (!user.roomCreated.includes(room._id)) {
      user.roomCreated.push(room._id);
      await user.save();
    }

    // 🔥 POPULATE createdBy & members BEFORE sending response
    const populatedRoom = await Room.findById(room._id)
      .populate("createdBy", "_id username email")
      .populate("members", "_id username email");

    res.status(201).json({
      success: true,
      message: "Room created successfully",
      room: populatedRoom,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
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

    // 1️⃣ Validate Room ID
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Room ID",
      });
    }

    // 2️⃣ Find Room
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    // 3️⃣ Authorization (only creator can delete)
    if (room.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this room",
      });
    }

    // 4️⃣ Remove roomId from creator's roomCreated
    await User.findByIdAndUpdate(userId, {
      $pull: { roomCreated: roomId },
    });

    // 5️⃣ Remove roomId from all members' roomsJoined
    await User.updateMany(
      { _id: { $in: room.members } },
      { $pull: { roomsJoined: roomId } }
    );

    // 6️⃣ Delete the room
    await Room.findByIdAndDelete(roomId);

    return res.status(200).json({
      success: true,
      message: "Room deleted successfully",
    });

  } catch (error) {
    console.error("Delete Room Error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
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


//Get the Total Members from the Rooms you created and also you present
exports.getDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id;

        const rooms = await Room.find({
            $or: [
                { createdBy: userId },
                { members: userId }
            ]
        }).populate("members", "_id");

        const memberSet = new Set();

        rooms.forEach(room => {
            room.members.forEach(member => {
                if (member._id.toString() !== userId) {
                    memberSet.add(member._id.toString());
                }
            });
        });

        res.status(200).json({
            success: true,
            totalMembers: memberSet.size,
            totalRooms: rooms.length
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
