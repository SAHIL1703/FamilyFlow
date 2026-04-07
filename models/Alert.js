const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AlertSchema = new Schema({
    userId: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    macAddress: { 
        type: String, 
        required: true 
    },
    alertType: { 
        type: String, 
        default: 'SCREAM' 
    },
    score: { 
        type: Number,
        default: null // Good for debugging ML confidence later
    },
    detectedAt: { 
        type: Date, 
        default: Date.now 
    }
}, { timestamps: true });

module.exports = mongoose.model("Alert", AlertSchema);