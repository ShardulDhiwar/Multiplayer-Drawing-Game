// src/rooms/roomManager.js
const { getRandomWord, getWordHint, getNextRevealIndex } = require("../games/words");

const rooms = new Map(); // roomId -> Room

const ROUND_DURATION = 80; // seconds
const HINT_INTERVAL = 20;  // reveal a letter every N seconds
const MAX_ROUNDS = 3;

function createRoom(roomId) {
  rooms.set(roomId, {
    roomId,
    players: [],          // { id, username, score, connected }
    drawerIndex: 0,
    currentWord: null,
    round: 0,
    maxRounds: MAX_ROUNDS,
    status: "waiting",    // waiting | playing | ended
    timer: null,
    hintTimer: null,
    revealedIndices: new Set(),
    correctGuessers: new Set(),
  });
  return rooms.get(roomId);
}

function getRoom(roomId) {
  return rooms.get(roomId) || null;
}

function deleteRoom(roomId) {
  const room = rooms.get(roomId);
  if (room) {
    clearInterval(room.timer);
    clearInterval(room.hintTimer);
  }
  rooms.delete(roomId);
}

function addPlayer(roomId, { id, username }) {
  const room = getRoom(roomId);
  if (!room) return null;

  const existing = room.players.find((p) => p.username === username);
  if (existing) {
    // Reconnection: restore socket id
    existing.id = id;
    existing.connected = true;
    return room;
  }

  room.players.push({ id, username, score: 0, connected: true });
  return room;
}

function removePlayer(roomId, socketId) {
  const room = getRoom(roomId);
  if (!room) return null;
  const player = room.players.find((p) => p.id === socketId);
  if (player) player.connected = false;
  return room;
}

function getDrawer(room) {
  const connected = room.players.filter((p) => p.connected);
  if (connected.length === 0) return null;
  return room.players[room.drawerIndex % room.players.length];
}

function startRound(room, io) {
  if (room.round >= room.maxRounds) {
    endGame(room, io);
    return;
  }

  room.round += 1;
  room.correctGuessers = new Set();
  room.revealedIndices = new Set();
  room.currentWord = getRandomWord();
  room.status = "playing";

  const drawer = getDrawer(room);
  if (!drawer) return;

  const hint = getWordHint(room.currentWord, room.revealedIndices);

  // Send word to drawer inside start_round so there's no race condition
  const isDrawerConnected = !!drawer.id;

  // Send start_round to everyone - drawer gets word, others get null
  room.players.forEach((player) => {
    const isThisDrawer = player.username === drawer.username;
    io.to(player.id).emit("start_round", {
      drawer: drawer.username,
      wordLength: room.currentWord.length,
      hint,
      round: room.round,
      maxRounds: room.maxRounds,
      timeLeft: ROUND_DURATION,
      myWord: isThisDrawer ? room.currentWord : null, // only drawer gets the word
    });
  });

  // Hint reveal timer
  let elapsed = 0;
  room.hintTimer = setInterval(() => {
    elapsed += HINT_INTERVAL;
    if (elapsed < ROUND_DURATION) {
      const idx = getNextRevealIndex(room.currentWord, room.revealedIndices);
      if (idx !== null) {
        room.revealedIndices.add(idx);
        const newHint = getWordHint(room.currentWord, room.revealedIndices);
        io.to(room.roomId).emit("hint_update", { hint: newHint });
      }
    }
  }, HINT_INTERVAL * 1000);

  // Round countdown timer
  let timeLeft = ROUND_DURATION;
  room.timer = setInterval(() => {
    timeLeft--;
    io.to(room.roomId).emit("timer_tick", { timeLeft });
    if (timeLeft <= 0) {
      endRound(room, io);
    }
  }, 1000);
}

function endRound(room, io) {
  clearInterval(room.timer);
  clearInterval(room.hintTimer);

  io.to(room.roomId).emit("round_ended", {
    word: room.currentWord,
    scores: room.players.map(({ username, score }) => ({ username, score })),
  });

  // Advance drawer
  room.drawerIndex = (room.drawerIndex + 1) % room.players.length;

  setTimeout(() => {
    startRound(room, io);
  }, 4000);
}

function endGame(room, io) {
  room.status = "ended";
  const sorted = [...room.players]
    .sort((a, b) => b.score - a.score)
    .map(({ username, score }) => ({ username, score }));

  io.to(room.roomId).emit("end_game", { finalScores: sorted });
}

function handleGuess(room, io, { socketId, username, text }) {
  if (!room.currentWord) return;
  const drawer = getDrawer(room);
  if (drawer && drawer.id === socketId) return; // drawer can't guess

  const isCorrect =
    text.trim().toLowerCase() === room.currentWord.toLowerCase();

  if (isCorrect && !room.correctGuessers.has(username)) {
    room.correctGuessers.add(username);

    // Points: faster = more points
    const guesserPoints = Math.max(10, 100 - room.correctGuessers.size * 10);
    const drawerPoints = 15;

    const guesser = room.players.find((p) => p.username === username);
    if (guesser) guesser.score += guesserPoints;
    if (drawer) drawer.score += drawerPoints;

    io.to(room.roomId).emit("correct_guess", {
      username,
      points: guesserPoints,
      scores: room.players.map(({ username, score }) => ({ username, score })),
    });

    // End round early if everyone guessed
    const eligiblePlayers = room.players.filter(
      (p) => p.connected && p.username !== drawer?.username
    );
    if (room.correctGuessers.size >= eligiblePlayers.length) {
      endRound(room, io);
    }
  } else if (!isCorrect) {
    // Broadcast chat to others (hide wrong guesses from drawer)
    io.to(room.roomId).emit("receive_message", {
      username,
      text,
      isCorrect: false,
    });
  }
}

module.exports = {
  createRoom,
  getRoom,
  deleteRoom,
  addPlayer,
  removePlayer,
  getDrawer,
  startRound,
  handleGuess,
};