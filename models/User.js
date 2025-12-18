const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const UserSchema = new Schema({
    username: {
        type: String,
        unique: true,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, "Invalid email format"]
    },
    password: {
        type: String,
        required: true
    },
    roomCreated:[
        {
            type: Schema.Types.ObjectId,
            ref: 'Room'
        }
    ],
    roomsJoined: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Room'
        }
    ],
    invitationMember: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
    }]
    ,
    location: {
        latitude: {
            type: Number,
            default: null
        },
        longitude: {
            type: Number,
            default: null
        },
        lastUpdated: {
            type: Date,
            default: null
        }
    },
    isOnline: {
        type: Boolean,
        default: false
    },

    lastSeen: {
        type: Date,
        default: null
    },
});

module.exports = mongoose.model("User", UserSchema);