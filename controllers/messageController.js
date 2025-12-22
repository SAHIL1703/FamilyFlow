const Message = require("../models/Message");
const Room = require("../models/Room");

exports.sendMessage = async (req, res) => {
  try {
    const { text } = req.body;
    const { roomId } = req.params;
    const userId = req.user.id;

    if (!text) return res.status(400).json({ success: false, message: "Required" });

    // 1. Create message
    const message = await Message.create({
      text,
      createdBy: userId,
      room: roomId,
    });

    // 2. Update Room
    await Room.findByIdAndUpdate(roomId, { $push: { chats: message._id } });

    // 3. Populate
    const populatedMessage = await message.populate("createdBy", "username email");

    // 4. 🔥 LIVE EMIT: Get 'io' instance and send to the specific room
    const io = req.app.get("io");
    io.to(roomId).emit("receive_message", populatedMessage);

    res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    console.error("Send Message Error:", error);
    res.status(500).json({ success: false, message: "Error" });
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
