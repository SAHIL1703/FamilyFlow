const Message = require("../models/Message");
const Room = require("../models/Room");

exports.sendMessage = async (req, res) => {
  try {
    const { text } = req.body;
    const { roomId } = req.params; // This is coming from /api/messages/:roomId
    const userId = req.user.id;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Message text is required",
      });
    }

    // 1. Create message WITH the room ID
    const message = await Message.create({
      text,
      createdBy: userId,
      room: roomId, // <--- ADD THIS LINE TO FIX THE ERROR
    });

    // 2. Push message into room's chat array
    await Room.findByIdAndUpdate(
      roomId,
      { $push: { chats: message._id } },
      { new: true }
    );

    // 3. Populate sender details for the frontend
    const populatedMessage = await message.populate(
      "createdBy",
      "username email"
    );

    res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    console.error("Send Message Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId).populate({
      path: "chats",
      populate: {
        path: "createdBy",
        select: "username email isOnline lastSeen",
      },
      options: { sort: { createdAt: 1 } },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    res.status(200).json({
      success: true,
      messages: room.chats,
    });
  } catch (error) {
    console.error("Fetch Messages Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
