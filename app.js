const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const dotenv = require("dotenv");
const connectDB = require("./config/db.js");


// Load ENV variables
dotenv.config();

// Connect to Database
connectDB();

// Import Routes
const authRoutes = require("./routes/auth.js");
const protect = require("./middleware/authMiddleware.js");
// Later you will add:
// const roomRoutes = require("./routes/roomRoutes");
// const inviteRoutes = require("./routes/inviteRoutes");

const app = express();

// ----------------------
// 🔥 Global Middlewares
// ----------------------

// Security headers
app.use(helmet());

// Enable CORS for frontend
app.use(cors({
    origin: "*",     // you can restrict later
    methods: ["GET", "POST", "PUT", "DELETE"],
}));

// Parse incoming JSON
app.use(express.json({ limit: "10mb" }));

// Parse form data
app.use(express.urlencoded({ extended: true }));

// Logger (shows incoming requests)
app.use(morgan("dev"));


// ----------------------
// 🔥 Routes
// ----------------------
app.use("/api/auth", authRoutes);
// app.use("/api/rooms", roomRoutes);
// app.use("/api/invites", inviteRoutes);


// ----------------------
// 🔥 Test Route
// ----------------------
app.get("/",protect, (req, res) => {
    res.send("Family Tracker API is Running...");
    console.dir(req)
});


// ----------------------
// 🔥 404 Handler
// ----------------------
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});


// ----------------------
// 🔥 Global Error Handler
// ----------------------
app.use((err, req, res, next) => {
    console.error("SERVER ERROR:", err);
    res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: err.message,
    });
});


// ----------------------
// 🔥 Start the Server
// ----------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
