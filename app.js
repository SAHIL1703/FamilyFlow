const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db.js");

// ==========================================
// 📦 MODELS
// ==========================================
const Location = require("./models/Location.js");
const User = require("./models/User.js");
const Alert = require("./models/Alert.js"); // 🚨 NEW: Alert Model Imported

// ==========================================
// 🛣️ ROUTE IMPORTS
// ==========================================
const authRoutes = require("./routes/auth.js");
const roomRoutes = require('./routes/room.js');
const inviteRoutes = require("./routes/invite.js");
const locationRoutes = require("./routes/location.js");
const messageRoutes = require("./routes/message.js");
const alertRoutes = require("./routes/alert.js"); // 🚨 NEW: Alert Routes Imported

// Configuration
dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// =======================================================================
// 🔒 CORS CONFIGURATION
// =======================================================================
const allowedOrigins = [
    "https://family-flow-pied.vercel.app",   // Production Frontend
    "http://localhost:5173",                 // Local Dev
    "http://localhost:3000",                 // Local Backend
    "https://localhost",                     // 🟢 Android App (HTTPS)
    "http://localhost",                      // 🟢 Android App (HTTP - backup)
    "capacitor://localhost",                 // 🔵 iOS App
    "http://127.0.0.1:5500",                 // VS Code Live Server (IP)
    "http://localhost:5500",
    "http://127.0.0.1:5504",                 // VS Code Live Server (IP)
    "http://localhost:5504",
];

const corsOptions = {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // Allows Cookies/Sessions to work
};

// =======================================================================
// 🔌 SOCKET.IO SETUP
// =======================================================================
const io = new Server(server, {
    cors: {
        origin: allowedOrigins, 
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'] 
});

// Attach io to app instance so it can be used in controllers via req.app.get("io")
app.set("io", io);

// =======================================================================
// 🛡️ MIDDLEWARE
// =======================================================================
app.use(helmet({
    contentSecurityPolicy: false, 
}));

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

/**
 * ==========================================
 * ⚡ REAL-TIME SOCKET LOGIC
 * ==========================================
 */
io.on("connection", (socket) => {
    console.log("⚡ New Client Connected:", socket.id);

    // 1. SETUP: Handling Room Entry & Online Status
    socket.on("setup_socket", async (userId) => {
        if (!userId) return;
        socket.userId = userId;

        try {
            const user = await User.findByIdAndUpdate(userId, { 
                isOnline: true 
            }, { new: true }).populate('roomsJoined').populate('roomCreated');

            if (!user) return;

            const allRoomIds = [
                ...user.roomsJoined.map(r => r._id.toString()),
                ...user.roomCreated.map(r => r._id.toString())
            ];
            
            const uniqueRooms = [...new Set(allRoomIds)];
            socket.join(uniqueRooms);
            console.log(`👤 User ${user.username} joined ${uniqueRooms.length} rooms`);

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
            const user = await User.findByIdAndUpdate(userId, {
                location: { latitude, longitude, lastUpdated: Date.now() },
                isOnline: true
            }, { new: true }).populate('roomsJoined').populate('roomCreated');

            if (!user) return;

            const allRoomIds = [
                ...user.roomsJoined.map(r => r._id.toString()),
                ...user.roomCreated.map(r => r._id.toString())
            ];
            const uniqueRooms = [...new Set(allRoomIds)];

            uniqueRooms.forEach(async (roomId) => {
                await Location.findOneAndUpdate(
                    { userId, roomId },
                    { latitude, longitude, updatedAt: Date.now() },
                    { upsert: true, new: true }
                );

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

    // 3. 🚨 REAL-TIME SCREAM DETECTION LISTENER
    socket.on("scream_detected", async (data) => {
        console.log("🚨 REAL-TIME SCREAM DETECTED:", data);

        try {
            // A. Find the user who owns this specific ESP32 MAC address
            const user = await User.findOne({ deviceMac: data.macAddress })
                                   .populate('roomsJoined')
                                   .populate('roomCreated');

            if (!user) {
                console.log(`❌ No user found linked to MAC: ${data.macAddress}`);
                return;
            }

            console.log(`⚠️ Scream belongs to User: ${user.username}`);

            // 👇 B. SAVE THE ALERT TO THE DATABASE HISTORY
            const newAlert = await Alert.create({
                userId: user._id,
                macAddress: data.macAddress,
                alertType: data.alertType || "SCREAM",
                score: data.score,
                detectedAt: data.timestamp || Date.now()
            });
            console.log("💾 Scream alert safely stored in database History!");

            // C. Gather all of this user's rooms (their family groups)
            const allRoomIds = [
                ...user.roomsJoined.map(r => r._id.toString()),
                ...user.roomCreated.map(r => r._id.toString())
            ];
            const uniqueRooms = [...new Set(allRoomIds)];

            // D. Broadcast the emergency ONLY to this user's rooms!
            const alertPayload = { 
                type: "SCREAM",
                message: `Emergency! Scream detected at ${user.username}'s device!`,
                timestamp: data.timestamp,
                userId: user._id.toString()
            };

            if (uniqueRooms.length > 0) {
                let totalSocketsInRooms = 0;
                uniqueRooms.forEach(roomId => {
                    const roomSockets = io.sockets.adapter.rooms.get(roomId);
                    const count = roomSockets ? roomSockets.size : 0;
                    totalSocketsInRooms += count;
                    console.log(`🔍 Room ${roomId} has ${count} socket(s):`, roomSockets ? [...roomSockets] : []);
                    io.to(roomId).emit("emergency_alert", alertPayload);
                });
                console.log(`📡 Alert sent to ${uniqueRooms.length} rooms (${totalSocketsInRooms} total sockets).`);

                // 🚨 FALLBACK: If no sockets in rooms, broadcast to ALL connected sockets
                if (totalSocketsInRooms === 0) {
                    console.warn("⚠️ No sockets in rooms! Broadcasting to ALL connected sockets.");
                    io.emit("emergency_alert", alertPayload);
                }
            } else {
                console.log("User has no rooms. No one to alert.");
            }

        } catch (error) {
            console.error("❌ Error handling scream socket event:", error);
        }
    });

    // 4. User Disconnection (Window Closed)
    socket.on("disconnect", async () => {
        console.log("❌ User disconnected:", socket.id);

        if (socket.userId) {
            try {
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

// ==========================================
// 🌐 API ROUTES
// ==========================================
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/alerts", alertRoutes); // 🚨 NEW: Alert History API Route

app.get("/", (req, res) => {
    console.log("Welcome to Server");
    res.send("Welcome to Server");
});

// ==========================================
// 🛑 ERROR HANDLING
// ==========================================
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        success: false,
        message: err.message,
        stack: process.env.NODE_ENV === "production" ? null : err.stack,
    });
});

// ==========================================
// 🚀 START SERVER
// ==========================================
const PORT = process.env.PORT || 3000;

// IMPORTANT: Listen using 'server', not 'app'
server.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});