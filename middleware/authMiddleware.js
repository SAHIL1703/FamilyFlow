// const jwt = require('jsonwebtoken');

// const protect = (req, res, next) => {

//     const authHeader = req.headers.authorization;

//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//         return res.status(401).json({ error: "No token provided" });
//     }
//     const token = authHeader.split(" ")[1];

//     try {
//         const decoded = jwt.verify(token, "123456789");
//         req.user = { id: decoded.userId };
//         console.log("Authenticated User Details:", req.user);
//         next();
//     } catch (error) {
//         res.status(401).json({ message: "Not authorized, token failed" })
//     }
// }

// module.exports = protect;

const jwt = require("jsonwebtoken");
const User = require("../models/User.js");

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, "123456789");
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
