// src/socket/handlers.js
const {
  createRoom, getRoom, deleteRoom,
  addPlayer, removePlayer, getDrawer,
  startRound, beginRound, handleGuess,
  playAgain,
} = require("../rooms/roomManager");

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

module.exports = function registerHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // ─── Create Room ───────────────────────────────────────────
    socket.on("create_room", ({ username }, callback) => {
      const roomId = generateRoomId();
      createRoom(roomId);
      const room = addPlayer(roomId, { id: socket.id, username });
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.username = username;

      callback({
        success: true,
        roomId,
        players: room.players.map(({ username, score }) => ({ username, score })),
      });
    });

    // ─── Join Room ─────────────────────────────────────────────
    socket.on("join_room", ({ username, roomId }, callback) => {
      const room = getRoom(roomId);
      if (!room) {
        return callback({ success: false, error: "Room not found" });
      }
      // Allow joining ended rooms so play-again works for late rejoins
      if (room.status === "ended") {
        return callback({ success: false, error: "Game already ended" });
      }

      const updatedRoom = addPlayer(roomId, { id: socket.id, username });
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.username = username;

      socket.to(roomId).emit("player_joined", {
        username,
        players: updatedRoom.players.map(({ username, score }) => ({
          username,
          score,
        })),
      });

      callback({
        success: true,
        roomId,
        players: updatedRoom.players.map(({ username, score }) => ({
          username,
          score,
        })),
      });
    });

    // ─── Start Game ────────────────────────────────────────────
    socket.on("start_game", () => {
      const { roomId } = socket.data;
      const room = getRoom(roomId);
      if (!room || room.status !== "waiting") return;
      if (room.players.length < 2) {
        socket.emit("error_msg", { message: "Need at least 2 players" });
        return;
      }
      startRound(room, io);
    });

    // ─── Play Again ────────────────────────────────────────────
    socket.on("play_again", () => {
      const { roomId } = socket.data;
      const room = getRoom(roomId);
      if (!room || room.status !== "ended") return;
      playAgain(room, io);
    });

    // ─── Pick Word ─────────────────────────────────────────────
    socket.on("pick_word", ({ word }) => {
      const { roomId } = socket.data;
      const room = getRoom(roomId);
      if (!room || room.status !== "choosing") return;

      const drawer = getDrawer(room);
      if (!drawer || drawer.id !== socket.id) return;
      if (!room.wordChoices || !room.wordChoices.includes(word)) return;

      beginRound(room, io, word);
    });

    // ─── Draw ──────────────────────────────────────────────────
    socket.on("draw", (stroke) => {
      const { roomId } = socket.data;
      const room = getRoom(roomId);
      if (!room) return;

      const drawer = getDrawer(room);
      if (!drawer || drawer.id !== socket.id) return;

      socket.to(roomId).emit("draw", stroke);
    });

    // ─── Fill Canvas ───────────────────────────────────────────
    socket.on("fill_canvas", ({ x, y, color }) => {
      const { roomId } = socket.data;
      const room = getRoom(roomId);
      if (!room) return;

      const drawer = getDrawer(room);
      if (!drawer || drawer.id !== socket.id) return;

      socket.to(roomId).emit("fill_canvas", { x, y, color });
    });

    // ─── Undo Canvas ───────────────────────────────────────────
    socket.on("undo_canvas", ({ dataUrl }) => {
      const { roomId } = socket.data;
      const room = getRoom(roomId);
      if (!room) return;

      const drawer = getDrawer(room);
      if (!drawer || drawer.id !== socket.id) return;

      socket.to(roomId).emit("undo_canvas", { dataUrl });
    });

    // ─── Clear Canvas ──────────────────────────────────────────
    socket.on("clear_canvas", () => {
      const { roomId } = socket.data;
      const room = getRoom(roomId);
      if (!room) return;
      const drawer = getDrawer(room);
      if (!drawer || drawer.id !== socket.id) return;

      room.strokes = [];
      io.to(roomId).emit("clear_canvas");
    });

    // ─── Chat / Guess ──────────────────────────────────────────
    socket.on("send_message", ({ text }) => {
      const { roomId, username } = socket.data;
      const room = getRoom(roomId);
      if (!room || room.status !== "playing") return;
      handleGuess(room, io, { socketId: socket.id, username, text });
    });

    // ─── Disconnect ────────────────────────────────────────────
    socket.on("disconnect", () => {
      const { roomId, username } = socket.data;
      if (!roomId) return;

      const room = removePlayer(roomId, socket.id);
      if (!room) return;

      const connected = room.players.filter((p) => p.connected);
      console.log(`${username} disconnected from ${roomId}`);

      if (connected.length === 0) {
        setTimeout(() => {
          const r = getRoom(roomId);
          if (r && r.players.filter((p) => p.connected).length === 0) {
            deleteRoom(roomId);
            console.log(`Room ${roomId} deleted`);
          }
        }, 30000);
      } else {
        io.to(roomId).emit("player_disconnected", {
          username,
          players: room.players.map(({ username, score, connected }) => ({
            username,
            score,
            connected,
          })),
        });
      }
    });
  });
};