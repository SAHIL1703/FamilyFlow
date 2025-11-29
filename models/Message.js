const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const model = mongoose.model;

const MessageSchema = new Schema({
    text : {
        type : String,
        required : true,
        trim : true
    },
    createdBy : {
        type : Schema.Types.ObjectId,
        ref : 'User',
        required : true
    },
}, {timestamps : true});

module.exports = model('Message' , MessageSchema);