const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No token provided" });
    }
    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, "123456789");
        req.user = { id: decoded.userId };
        console.log("Authenticated User Details:", req.user);
        next();
    } catch (error) {
        res.status(401).json({ message: "Not authorized, token failed" })
    }
}

module.exports = protect;