const express = require('express');
const router = express.Router();
const {sendInvitation , getMyInvitations , acceptInvitation , rejectInvitation} = require('../controllers/inviteController.js')
const protect = require('./../middleware/authMiddleware.js')

//Send an invite
router.post('/send' , protect , sendInvitation);

//Get all invitation
router.get('/' , protect , getMyInvitations);

//Accept invitation
router.post('/accept/:invitationId' , protect , acceptInvitation);

//Reject Invitation
router.post("/reject/:invitationId", protect, rejectInvitation);

module.exports = router;