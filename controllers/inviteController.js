const Room = require("../models/Room.js");
const RoomInvitaion = require("../models/RoomInvitaion.js");
const User = require("../models/User.js");

// exports.sendInvitation = async (req, res) => {
//     try {
//         const { roomId, receiverEmail } = req.body;
//         const senderId = req.user.id;

//         if (!roomId || !receiverEmail) {
//             return res.status(400).json({ success: false, message: "Room ID and Receiver Email are required" });
//         }

//         //Check if Room Exists
//         const room = await Room.findById(roomId);
//         if (!room) {
//             return res.status(404).json({ success: false, message: "Room not found" });
//         }

//         

//         //Only Creator Can send Invitations
//         if (room.createdBy.toString() !== senderId) {
//             return res.status(403).json({ success: false, message: "Only Room Creator can send invitations" });
//         }

//         //Create Invitation
//         const invitation = await RoomInvitaion.create({
//             roomId,
//             senderId,
//             receiverEmail
//         })
//         res.status(201).json({ success: true, message: "Invitation Sent", invitation });
//     } catch (error) {
//         console.error("Invite Room Error:", error);
//         res.status(500).json({ success: false, error: error.message });
//     }
// }
exports.sendInvitation = async (req, res) => {
    try {
        const { roomId, receiverEmail } = req.body;
        const senderId = req.user.id; // Injected by your Auth Middleware

        // 1. Basic Validation
        if (!roomId || !receiverEmail) {
            return res.status(400).json({
                success: false,
                message: "Room ID and Receiver Email are required"
            });
        }

        // 2. Check if Room Exists
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found"
            });
        }

        // 3. Permission Check: Only Creator Can send Invitations
        if (room.createdBy.toString() !== senderId) {
            return res.status(403).json({
                success: false,
                message: "Only the Room Creator can send invitations"
            });
        }

        // 4. User Presence Check: Does the receiver have an account?
        const targetUser = await User.findOne({ email: receiverEmail });
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: "User not found. They must have an account to be invited."
            });
        }

        // 5. Self-Invitation Check: Prevent inviting yourself
        if (targetUser._id.toString() === senderId) {
            return res.status(400).json({
                success: false,
                message: "You cannot invite yourself to your own room"
            });
        }

        // 6. Membership Check: Is the user already in the room?
        if (room.members.includes(targetUser._id)) {
            return res.status(400).json({
                success: false,
                message: "This user is already a member of this room"
            });
        }

        // 7. Duplicate Invitation Check: Is there already a pending invite?
        const existingInvite = await RoomInvitaion.findOne({
            roomId,
            receiverEmail,
            status: "pending"
        });

        if (existingInvite) {
            return res.status(400).json({
                success: false,
                message: "An invitation is already pending for this user"
            });
        }

        // 8. Create the Invitation
        const invitation = await RoomInvitaion.create({
            roomId,
            senderId,
            receiverEmail
        });

        // 9. Success Response
        return res.status(201).json({
            success: true,
            message: "Invitation sent successfully",
            invitation
        });

    } catch (error) {
        console.error("Invite Room Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};


exports.getMyInvitations = async (req, res) => {
    try {
        const userId = req.user.id;
        //Let Extract the User Document from the Database
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        //Extract all the Invitation sent to this User
        const invitations = await RoomInvitaion.find({ receiverEmail: user.email }).populate('roomId senderId');
        if (!invitations) {
            return res.status(404).json({ success: false, message: "No Invitations found" });
        }

        res.status(200).json({ success: true, invitations });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

exports.acceptInvitation = async (req, res) => {
    try {
        const { invitationId } = req.params;
        const receiverId = req.user.id;

        // 1️⃣ Fetch receiver
        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({ message: "User not found" });
        }

        // 2️⃣ Fetch invitation
        const invitation = await RoomInvitaion.findById(invitationId);
        if (!invitation) {
            return res.status(404).json({ message: "Invitation not found" });
        }

        // 3️⃣ Only receiver can accept
        if (invitation.receiverEmail !== receiver.email) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        if (invitation.status !== "pending") {
            return res.status(400).json({ message: "Invitation already processed" });
        }

        // 4️⃣ Accept invitation
        invitation.status = "accepted";
        await invitation.save();

        // 5️⃣ Add receiver to room
        const room = await Room.findById(invitation.roomId);
        if (!room) {
            return res.status(404).json({ message: "Room not found" });
        }

        if (!room.members.includes(receiverId)) {
            room.members.push(receiverId);
            await room.save();
        }

        // 6️⃣ Add room to receiver
        if (!receiver.roomsJoined.includes(room._id)) {
            receiver.roomsJoined.push(room._id);
            await receiver.save();
        }

        // 🔥 7️⃣ UPDATE SENDER → invitationMember
        const sender = await User.findById(invitation.senderId);
        if (sender) {
            if (!sender.invitationMember.includes(receiverId)) {
                sender.invitationMember.push(receiverId);
                await sender.save();
            }
        }

        res.status(200).json({
            success: true,
            message: "Invitation accepted successfully",
            room
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};





// Reject Invitation
exports.rejectInvitation = async (req, res) => {
    try {
        const { invitationId } = req.params;
        const userId = req.user.id;

        // 1️⃣ Fetch user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // 2️⃣ Fetch invitation
        const invitation = await RoomInvitaion.findById(invitationId);
        if (!invitation) {
            return res.status(404).json({
                success: false,
                message: "Invitation not found"
            });
        }

        // 3️⃣ Only receiver can reject
        if (invitation.receiverEmail !== user.email) {
            return res.status(403).json({
                success: false,
                message: "You cannot reject this invitation"
            });
        }

        // 4️⃣ Prevent multiple actions
        if (invitation.status !== "pending") {
            return res.status(400).json({
                success: false,
                message: "Invitation already processed"
            });
        }

        // 5️⃣ Reject invitation
        invitation.status = "rejected";
        await invitation.save();

        res.status(200).json({
            success: true,
            message: "Invitation rejected successfully"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};


exports.getSentPendingInvitations = async (req, res) => {
    try {
        const userId = req.user.id;

        const pendingInvites = await RoomInvitaion.find({
            senderId: userId,
            status: "pending",
        })
            .populate("receiverEmail")
            .populate("roomId", "roomName");

        res.status(200).json({
            success: true,
            count: pendingInvites.length,
            invitations: pendingInvites,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


exports.getInviteData = async (req, res) => {
    try {
        const userId = req.user.id;

        const invites = await RoomInvitaion.find({
            senderId: userId
        })
        if (!invites) {
            res.status(401).json({ success: true, message: "Invite Not Found" })
        } else {
            res.status(200).json({ success: true, invites })
        }

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: "Server Error" })
    }
}

exports.getInviteDataWithRoom = async (req, res) => {
  try {
    const userId = req.user.id;

    const invites = await RoomInvitaion.find({ senderId: userId })
      .populate("roomId", "roomName"); // ✅ valid

    return res.status(200).json({
      success: true,
      invites
    });

  } catch (error) {
    console.error("getInviteDataWithRoom error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

