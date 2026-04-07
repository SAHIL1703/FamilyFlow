const User = require('./../models/User.js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
// Register a New User
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      return res.status(400).json({ message: "User Already Exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword
    });

    const token = jwt.sign({ userId: user._id },  process.env.JWT, { expiresIn: "7d" });

    res.status(201).json({ user, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Login an Existing User
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User Does Not Exist" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid Password" });
    }

    const token = jwt.sign({ userId: user._id },  process.env.JWT, { expiresIn: "7d" });

    res.status(200).json({ user, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Link Device to User
exports.linkDevice = async (req, res) => {
  try {
    const { macAddress } = req.body;
    
    // 🔥 THE FIX: Safely grab the ID whether your middleware uses _id or userId
    const targetUserId = req.user._id || req.user.userId;

    if (!targetUserId) {
        return res.status(400).json({ error: "Could not identify user from token." });
    }

    const user = await User.findByIdAndUpdate(
        targetUserId, 
        { deviceMac: macAddress }, 
        { new: true }
    );

    // 🔥 NEW: Check if the user was actually found and updated
    if (!user) {
        return res.status(404).json({ error: "User not found in database." });
    }

    console.log(`✅ Successfully linked MAC ${macAddress} to user ${user.username}`);

    res.status(200).json({ message: "Device linked successfully!", user });
  } catch (error) {
    if (error.code === 11000) {
        return res.status(400).json({ error: "This device is already linked to another account." });
    }
    console.error("Link Device Error:", error);
    res.status(500).json({ error: error.message });
  }
};