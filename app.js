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

    // 1. SETUP: Handling Room Entry & Online Status
    socket.on("setup_socket", async (userId) => {
        if (!userId) return;

        // Save userId to the socket object for disconnect handling
        socket.userId = userId;

        try {
            // Update User to Online
            const user = await User.findByIdAndUpdate(userId, { 
                isOnline: true 
            }, { new: true }).populate('roomsJoined').populate('roomCreated');

            if (!user) return;

            // Collect all Room IDs
            const allRoomIds = [
                ...user.roomsJoined.map(r => r._id.toString()),
                ...user.roomCreated.map(r => r._id.toString())
            ];
            
            // Remove duplicates
            const uniqueRooms = [...new Set(allRoomIds)];

            // Socket joins all rooms
            socket.join(uniqueRooms);
            console.log(`👤 User ${user.username} joined ${uniqueRooms.length} rooms`);

            // Broadcast "Online" status to all these rooms
            uniqueRooms.forEach(roomId => {
                socket.to(roomId).emit("user_status_change", {
                    userId: userId,
                    status: "online"
                });
            });

        } catch (error) {
            console.error("Socket Setup Error:", error);
        }
    });

    // 2. Real-Time Location Updates
    socket.on("send_location", async (data) => {
        const { userId, latitude, longitude } = data;
        if (!userId || !latitude || !longitude) return;

        try {
            // A. Update User Profile (Global "Last Known")
            const user = await User.findByIdAndUpdate(userId, {
                location: { latitude, longitude, lastUpdated: Date.now() },
                isOnline: true
            }, { new: true }).populate('roomsJoined').populate('roomCreated');

            if (!user) return;

            // B. Get Rooms to broadcast to
            const allRoomIds = [
                ...user.roomsJoined.map(r => r._id.toString()),
                ...user.roomCreated.map(r => r._id.toString())
            ];
            const uniqueRooms = [...new Set(allRoomIds)];

            // C. Update specific Location tables & Broadcast
            uniqueRooms.forEach(async (roomId) => {
                // Save to Location History
                await Location.findOneAndUpdate(
                    { userId, roomId },
                    { latitude, longitude, updatedAt: Date.now() },
                    { upsert: true, new: true }
                );

                // Broadcast new coordinates
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

    // 3. User Disconnection (Window Closed)
    socket.on("disconnect", async () => {
        console.log("❌ User disconnected:", socket.id);

        // If we know who this socket was
        if (socket.userId) {
            try {
                // Mark as offline in DB
                const user = await User.findByIdAndUpdate(
                    socket.userId, 
                    { isOnline: false, lastSeen: Date.now() },
                    { new: true }
                ).populate('roomsJoined').populate('roomCreated');

                if (user) {
                    const allRoomIds = [
                        ...user.roomsJoined.map(r => r._id.toString()),
                        ...user.roomCreated.map(r => r._id.toString())
                    ];
                    const uniqueRooms = [...new Set(allRoomIds)];

                    // Tell everyone: "This user is now Offline"
                    uniqueRooms.forEach(roomId => {
                        socket.to(roomId).emit("user_status_change", {
                            userId: socket.userId,
                            status: "offline",
                            lastSeen: Date.now()
                        });
                    });
                }
            } catch (err) {
                console.error("Disconnect Error:", err);
            }
        }
    });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/messages", messageRoutes);

app.get("/" , (req,res)=>{
    console.log("Welcome to Server");
    res.send("Welcome to Server")
})

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