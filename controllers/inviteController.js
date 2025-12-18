const Room = require("../models/Room.js");
const RoomInvitaion = require("../models/RoomInvitaion.js");
const User = require("../models/User.js");

exports.sendInvitation = async (req, res) => {
    try {
        const { roomId, receiverEmail } = req.body;
        const senderId = req.user.id;

        if (!roomId || !receiverEmail) {
            return res.status(400).json({ success: false, message: "Room ID and Receiver Email are required" });
        }

        //Check if Room Exists
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ success: false, message: "Room not found" });
        }

        //Only Creator Can send Invitations
        if (room.createdBy.toString() !== senderId) {
            return res.status(403).json({ success: false, message: "Only Room Creator can send invitations" });
        }

        //Create Invitation
        const invitation = await RoomInvitaion.create({
            roomId,
            senderId,
            receiverEmail
        })
        res.status(201).json({ success: true, message: "Invitation Sent", invitation });
    } catch (error) {
        console.error("Invite Room Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
}

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
