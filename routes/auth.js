const express = require('express');
const { register, login } = require("../controllers/authController.js");
const protect = require('./../middleware/authMiddleware.js')
const router = express.Router();

router.get("/me",protect , (req, res) => {
  res.status(200).json({
    user: req.user, // decoded from token
  });
});
router.post('/register', register);
router.post('/login', login);

module.exports = router;