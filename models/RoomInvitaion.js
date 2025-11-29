const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const model = mongoose.model;

const RoominvitationSchema = new Schema({
    room : {
        type : Schema.Types.ObjectId,
        ref : 'Room',
        required : true
    },
    invitedUser : {
        type : Schema.Types.ObjectId,
        ref : 'User',
        required : true
    },
    invitedBy : {
        type : Schema.Types.ObjectId,
        ref : 'User',
        required : true
    },
    status : {
        type : String,
        enum : ['pending' , 'accepted' , 'declined'],
        default : 'pending'
    },
},{timestamps : true});

module.exports = model('RoomInvitation' , RoominvitationSchema);