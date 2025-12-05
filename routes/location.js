const express = require('express')
const router = express.Router();

const {updateLocation , getMyLocation , getRoomMembersLocation} = require("../controllers/locationController.js");
const protect = require('../middleware/authMiddleware.js');

//
router.post('/update' , protect , updateLocation);
router.get('/me' , protect , getMyLocation);
router.get("/room/:roomId" , protect , getRoomMembersLocation);

module.exports = router;
