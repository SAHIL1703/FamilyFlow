const express = require('express');
const router = express.Router();
const {createRoom , getRooms, deleteRoom, updateRoom, getDashboardStats} = require('./../controllers/roomController.js');
const protect = require('./../middleware/authMiddleware.js')

router.post('/create' , protect , createRoom);
router.get('/my-rooms' , protect , getRooms);
router.get('/room-count' , protect , getDashboardStats)
router.delete('/delete/:roomId' , protect , deleteRoom);
router.put('/update/:roomId' , protect , updateRoom);

module.exports = router;