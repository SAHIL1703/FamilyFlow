const express = require('express');
const { register, login, linkDevice } = require("../controllers/authController.js"); // 👈 import linkDevice
const protect = require('./../middleware/authMiddleware.js');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get("/me", protect, (req, res) => {
  res.status(200).json({ user: req.user });
});

// 👇 NEW: Protected route to save MAC address
router.post('/link-device', protect, linkDevice); 

module.exports = router;