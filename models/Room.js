const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const model = mongoose.model;

const RoomSchema = new Schema({
    roomName: {
        type: String,
        required: true,
        trim: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [
        {
            type: Schema.Types.ObjectId,
            ref: 'User',
        }
    ],
    chats: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message"
        }
    ],
    description : {
        type : String,
        trim : true,
    }
},{ timestamps: true });

module.exports = model("Room", RoomSchema);