// src/index.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const registerHandlers = require("./socket/handlers");

const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Vite default port
    methods: ["GET", "POST"],
  },
  // Reconnection support
  pingTimeout: 10000,
  pingInterval: 5000,
});

registerHandlers(io);

server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});