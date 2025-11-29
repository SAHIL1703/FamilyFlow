const express = require('express');
const app = express();
const connectDB = require('./config/db.js');

//Connect Database
connectDB();


app.get('/' , (req,res)=>{
    res.send("Hello World");
})

app.listen(3000, ()=>{
    console.log("Server Running on Port 3000");
})