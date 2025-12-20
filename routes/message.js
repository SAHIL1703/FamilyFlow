const express = require("express");
const router = express.Router();
const {
  sendMessage,
  getRoomMessages,
} = require("../controllers/messageController.js");

const protect = require("../middleware/authMiddleware.js");

router.post("/:roomId", protect, sendMessage);
router.get("/:roomId", protect, getRoomMessages);

module.exports = router;
