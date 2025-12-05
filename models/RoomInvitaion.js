const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const model = mongoose.model;

const RoomInvitationSchema = new Schema({
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Room",
        required: true,
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    receiverEmail: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending",
    },
}, { timestamps: true });

module.exports = model('RoomInvitation', RoomInvitationSchema);