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

exports.acceptInvitation = async(req,res)=>{
    try {
        const invitationId = req.params.invitationId;
        const userId = req.user.id;

        const user = await User.findById(userId);

        //Fetch the invitations
        const invitation = await RoomInvitaion.findById(invitationId);
        if(!invitation){
            return res.status(404).json({success : false , message : 'Invitation Not Found'})
        }

        //Only the recevier can accept
        if(invitation.receiverEmail !== user.email){
            return res.status(403).json({ message: "You cannot accept this invitation" });
        }

        //Update the invitation 
        invitation.status = "accepted";
        await invitation.save();

        //Add User to Room
        const room = await Room.findById(invitation.roomId);
        if(!room.members.includes(userId)){
            room.members.push(userId);
            await room.save();
        }

        res.status(200).json({success : true , message : "Invitation Accepted" , room});

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

//Reject Inviatation
exports.rejectInvitation = async(req,res)=>{
    try{
        const invitationId = req.params.invitationId;
        const userId = req.user.id;

        const user = await User.findById(userId);

        const invitation = await RoomInvitaion.findById(invitationId);
        if(!invitation){
            return res.status(404).json({success : false , message : "Invitation Not Found"});
        }

        //Only receiver can reject
        if(invitation.receiverEmail !== user.email){
            return res.status(403).json({ message: "You cannot reject this invitation" });
        }

        invitation.status = "rejected";
        await invitation.save();

        res.status(200).json({success : true , message : "Invitation Rejected" , invitation});

    }catch(error){
        res.status(500).json({ success: false, error: error.message });
    }
}

