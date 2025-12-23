const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async()=>{
    try {
        await mongoose.connect(process.env.MONGODB);
        console.log("MongoDB Connected");
    } catch (error) {
        console.log(error);
    }
}

//Export the Function
module.exports = connectDB;