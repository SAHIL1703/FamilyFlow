
const jwt = require("jsonwebtoken");
const User = require("../models/User.js");
require('dotenv').config();
console.log(process.env.JWT)
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT);
    console.log(decoded)
    // 🔥 FETCH FULL USER FROM DB
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user; // FULL USER OBJECT
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token invalid or expired" });
  }
};

module.exports = protect;
