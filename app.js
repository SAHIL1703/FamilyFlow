const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db.js");

// Models (Required for Socket Logic)
const Location = require("./models/Location.js");
const User = require("./models/User.js");

// Route Imports
const authRoutes = require("./routes/auth.js");
const roomRoutes = require('./routes/room.js');
const inviteRoutes = require("./routes/invite.js");
const locationRoutes = require("./routes/location.js");
const messageRoutes = require("./routes/message.js");

// Configuration
dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with optimized CORS
const io = new Server(server, {
    cors: {
        origin: "*", // In production, replace with your frontend URL
        methods: ["GET", "POST"]
    }
});

// Attach io to app instance so it can be used in controllers via req.app.get("io")
app.set("io", io);

// Standard Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Set to false if using external CDNs like Leaflet
}));
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

/**
 * ==========================================
 * REAL-TIME SOCKET LOGIC
 * ==========================================
 */
io.on("connection", (socket) => {
    console.log("⚡ New Client Connected:", socket.id);

    // 1. Handling Room Entry
    socket.on("join_room", (data) => {
        // Handle both object {roomId} or string roomId for flexibility
        const roomId = typeof data === 'string' ? data : data.roomId;
        socket.join(roomId);
        console.log(`👤 User joined room: ${roomId}`);
    });

    // 2. Real-Time Location Updates
    socket.on("send_location", async (data) => {
        const { userId, roomId, latitude, longitude } = data;

        if (!userId || !roomId) return;

        try {
            // Update Location Collection (Room specific)
            const updatedLocation = await Location.findOneAndUpdate(
                { userId, roomId },
                { latitude, longitude, updatedAt: Date.now() },
                { upsert: true, new: true }
            );

            // Update User Profile (Last known global position)
            await User.findByIdAndUpdate(userId, {
                location: {
                    latitude,
                    longitude,
                    lastUpdated: Date.now()
                },
                isOnline: true
            });

            // Broadcast to everyone else in the room
            socket.to(roomId).emit("receive_location", {
                userId,
                latitude,
                longitude,
                updatedAt: updatedLocation.updatedAt
            });

        } catch (error) {
            console.error("Socket Location Error:", error);
        }
    });

    // 3. User Disconnection
    socket.on("disconnect", () => {
        console.log("❌ User disconnected:", socket.id);
    });

    socket.on("send_location", async (data) => {
    const { userId, latitude, longitude } = data;
    if (!userId) return;

    try {
        // 1. Find the user and their rooms
        const user = await User.findById(userId).populate('roomsJoined');
        if (!user) return;

        // 2. Update User document last known location
        user.location = { latitude, longitude, lastUpdated: Date.now() };
        user.isOnline = true;
        await user.save();

        // 3. Loop through all rooms the user is in and broadcast
        const allRoomIds = [
            ...user.roomsJoined.map(r => r._id.toString()),
            ...user.roomCreated.map(r => r._id.toString())
        ];

        // Remove duplicates
        const uniqueRooms = [...new Set(allRoomIds)];

        uniqueRooms.forEach(roomId => {
            // Update the specific Location collection for history/persistence
            Location.findOneAndUpdate(
                { userId, roomId },
                { latitude, longitude, updatedAt: Date.now() },
                { upsert: true }
            ).exec(); // Fire and forget

            // Broadcast to the room
            socket.to(roomId).emit("receive_location", {
                userId,
                latitude,
                longitude,
                updatedAt: Date.now()
            });
        });

    } catch (error) {
        console.error("Global Tracking Error:", error);
    }
});
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/messages", messageRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        success: false,
        message: err.message,
        stack: process.env.NODE_ENV === "production" ? null : err.stack,
    });
});

const PORT = process.env.PORT || 3000;

// IMPORTANT: Listen using 'server', not 'app'
server.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});