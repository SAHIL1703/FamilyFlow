const express = require('express');
const router = express.Router();
const {sendInvitation , getMyInvitations , acceptInvitation , rejectInvitation, getSentPendingInvitations, getInviteData, getInviteDataWithRoom} = require('../controllers/inviteController.js')
const protect = require('./../middleware/authMiddleware.js')

//Send an invite
router.post('/send' , protect , sendInvitation);

//Get all invitation
router.get('/' , protect , getMyInvitations);

//Accept invitation
router.post('/accept/:invitationId' , protect , acceptInvitation);

//Reject Invitation
router.post("/reject/:invitationId", protect, rejectInvitation);

//Get Pending Invitaion Count
router.get("/sent/pending" , protect , getSentPendingInvitations)

//To get All Invite Number
router.get("/invite-stats",protect,getInviteData);

//To get the sent invite
router.get("/sent/with-room" , protect , getInviteDataWithRoom)

module.exports = router;