// src/socket.js
import { io } from "socket.io-client";

const socket = io("https://multiplayer-drawing-game-zytf.onrender.com", {
  autoConnect: false,
});

export default socket;