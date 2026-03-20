// src/rooms/roomManager.js
const { getThreeWords, getWordHint, getNextRevealIndex } = require("../games/words");

const rooms = new Map();

const ROUND_DURATION = 80;
const HINT_INTERVAL = 20;
const MAX_ROUNDS = 3;
const GAMES_PER_ROUND = 5;
const WORD_PICK_DURATION = 15;

function createRoom(roomId) {
  rooms.set(roomId, {
    roomId,
    players: [],
    playerIdCounter: 0,   // auto-increment seat ID (1,2,3...)
    drawerSeatIndex: 0,   // which seat draws next
    lastDrawerSeatId: null, // seat ID of whoever just drew
    currentWord: null,
    round: 0,
    game: 0,
    maxRounds: MAX_ROUNDS,
    gamesPerRound: GAMES_PER_ROUND,
    status: "waiting",
    timer: null,
    hintTimer: null,
    pickTimer: null,
    timeLeft: ROUND_DURATION,
    revealedIndices: new Set(),
    correctGuessers: new Set(),
    roundDrawerQueue: [],
    lastDrawerUsername: null, // prevents same person drawing first next round
    // For late-join canvas sync
    canvasDataUrl: null,
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
    clearTimeout(room.pickTimer);
  }
  rooms.delete(roomId);
}

function addPlayer(roomId, { id, username }) {
  const room = getRoom(roomId);
  if (!room) return null;
  const existing = room.players.find((p) => p.username === username);
  if (existing) {
    existing.id = id;
    existing.connected = true;
    return room;
  }
  room.playerIdCounter += 1;
  room.players.push({ id, username, score: 0, connected: true, seatId: room.playerIdCounter });
  return room;
}

function removePlayer(roomId, socketId) {
  const room = getRoom(roomId);
  if (!room) return null;
  const player = room.players.find((p) => p.id === socketId);
  if (player) player.connected = false;
  return room;
}

// Pick next drawer by seat order, skipping the seat that just drew
function pickNextDrawer(room) {
  const connected = room.players.filter((p) => p.connected);
  if (connected.length === 0) return null;

  // Sort by seatId so order is always 1 → 2 → 3 → ...
  const sorted = [...connected].sort((a, b) => a.seatId - b.seatId);

  // Find candidates: everyone except the seat that just drew
  const candidates = sorted.length > 1
    ? sorted.filter((p) => p.seatId !== room.lastDrawerSeatId)
    : sorted;

  // Pick the next seat after drawerSeatIndex, cycling through candidates
  // drawerSeatIndex tracks position in the candidates list
  const idx = room.drawerSeatIndex % candidates.length;
  room.drawerSeatIndex = idx + 1; // advance for next turn
  return candidates[idx];
}

function getDrawer(room) {
  if (room.roundDrawerQueue && room.roundDrawerQueue.length > 0) {
    return room.roundDrawerQueue[0];
  }
  return room.players.find((p) => p.connected) || null;
}

// Send current game state to a single late-joining socket
function syncLateJoiner(room, socket) {
  if (room.status === "ended") {
    const sorted = [...room.players]
      .sort((a, b) => b.score - a.score)
      .map(({ username, score }) => ({ username, score }));
    socket.emit("end_game", { finalScores: sorted });
    return;
  }

  if (room.status === "waiting") return;

  const drawer = getDrawer(room);

  if (room.status === "choosing") {
    socket.emit("waiting_for_word", {
      drawer: drawer?.username,
      round: room.round,
      maxRounds: room.maxRounds,
      game: room.game,
      gamesPerRound: room.gamesPerRound,
    });
    return;
  }

  if (room.status === "playing") {
    const hint = getWordHint(room.currentWord, room.revealedIndices);
    socket.emit("start_round", {
      drawer: drawer?.username,
      wordLength: room.currentWord.length,
      hint,
      round: room.round,
      maxRounds: room.maxRounds,
      game: room.game,
      gamesPerRound: room.gamesPerRound,
      timeLeft: room.timeLeft,
      myWord: null, // late joiners never get the word even if they're somehow the drawer
    });

    // Send current canvas state so they see what's been drawn
    if (room.canvasDataUrl) {
      socket.emit("canvas_sync", { dataUrl: room.canvasDataUrl });
    }
  }
}

function startTurn(room, io) {
  room.game += 1;
  room.canvasDataUrl = null; // clear canvas snapshot for new turn

  if (room.game > GAMES_PER_ROUND) {
    room.game = 1;
    room.round += 1;
  }

  if (room.round > MAX_ROUNDS) {
    endGame(room, io);
    return;
  }

  // Pick next drawer (never the same seat as last turn)
  const nextDrawer = pickNextDrawer(room);
  if (!nextDrawer) return;
  room.roundDrawerQueue = [nextDrawer];

  room.correctGuessers = new Set();
  room.revealedIndices = new Set();
  room.currentWord = null;
  room.status = "choosing";
  room.timeLeft = WORD_PICK_DURATION;

  const drawer = nextDrawer;

  const wordChoices = getThreeWords();
  room.wordChoices = wordChoices;

  io.to(drawer.id).emit("choose_word", {
    choices: wordChoices,
    timeLeft: WORD_PICK_DURATION,
    round: room.round,
    maxRounds: room.maxRounds,
    game: room.game,
    gamesPerRound: room.gamesPerRound,
  });

  room.players.forEach((player) => {
    if (player.username !== drawer.username) {
      io.to(player.id).emit("waiting_for_word", {
        drawer: drawer.username,
        round: room.round,
        maxRounds: room.maxRounds,
        game: room.game,
        gamesPerRound: room.gamesPerRound,
      });
    }
  });

  room.pickTimer = setTimeout(() => {
    if (room.status === "choosing") {
      const autoWord = wordChoices[Math.floor(Math.random() * wordChoices.length)];
      beginTurn(room, io, autoWord);
    }
  }, WORD_PICK_DURATION * 1000);
}

function beginTurn(room, io, word) {
  clearTimeout(room.pickTimer);
  room.currentWord = word;
  room.wordChoices = null;
  room.status = "playing";
  room.timeLeft = ROUND_DURATION;

  const drawer = getDrawer(room);
  if (!drawer) return;

  const hint = getWordHint(room.currentWord, room.revealedIndices);

  room.players.forEach((player) => {
    const isThisDrawer = player.username === drawer.username;
    io.to(player.id).emit("start_round", {
      drawer: drawer.username,
      wordLength: room.currentWord.length,
      hint,
      round: room.round,
      maxRounds: room.maxRounds,
      game: room.game,
      gamesPerRound: room.gamesPerRound,
      timeLeft: ROUND_DURATION,
      myWord: isThisDrawer ? room.currentWord : null,
    });
  });

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

  let timeLeft = ROUND_DURATION;
  room.timer = setInterval(() => {
    timeLeft--;
    room.timeLeft = timeLeft;
    io.to(room.roomId).emit("timer_tick", { timeLeft });
    if (timeLeft <= 0) {
      endTurn(room, io);
    }
  }, 1000);
}

function endTurn(room, io) {
  clearInterval(room.timer);
  clearInterval(room.hintTimer);
  clearTimeout(room.pickTimer);

  io.to(room.roomId).emit("round_ended", {
    word: room.currentWord,
    scores: room.players.map(({ username, score }) => ({ username, score })),
    round: room.round,
    game: room.game,
    gamesPerRound: room.gamesPerRound,
  });

  if (room.roundDrawerQueue && room.roundDrawerQueue.length > 0) {
    room.lastDrawerSeatId = room.roundDrawerQueue[0].seatId;
    room.roundDrawerQueue.shift();
  }

  setTimeout(() => startTurn(room, io), 4000);
}

function endGame(room, io) {
  room.status = "ended";
  const sorted = [...room.players]
    .sort((a, b) => b.score - a.score)
    .map(({ username, score }) => ({ username, score }));
  io.to(room.roomId).emit("end_game", { finalScores: sorted });
}

function resetRoom(room) {
  clearInterval(room.timer);
  clearInterval(room.hintTimer);
  clearTimeout(room.pickTimer);
  room.currentWord = null;
  room.wordChoices = null;
  room.round = 0;
  room.game = 0;
  room.status = "waiting";
  room.timer = null;
  room.hintTimer = null;
  room.pickTimer = null;
  room.timeLeft = ROUND_DURATION;
  room.revealedIndices = new Set();
  room.correctGuessers = new Set();
  room.roundDrawerQueue = [];
  room.lastDrawerSeatId = null;
  room.drawerSeatIndex = 0;
  room.canvasDataUrl = null;
  room.players.forEach((p) => { p.score = 0; });
}

function playAgain(room, io) {
  resetRoom(room);
  io.to(room.roomId).emit("play_again_starting", {
    players: room.players.map(({ username, score }) => ({ username, score })),
  });
  setTimeout(() => startTurn(room, io), 2000);
}

function handleGuess(room, io, { socketId, username, text }) {
  if (!room.currentWord) return;
  const drawer = getDrawer(room);
  if (drawer && drawer.id === socketId) return;

  const isCorrect = text.trim().toLowerCase() === room.currentWord.toLowerCase();

  if (isCorrect && !room.correctGuessers.has(username)) {
    room.correctGuessers.add(username);
    const guesserPoints = Math.max(10, 100 - room.correctGuessers.size * 10);

    const guesser = room.players.find((p) => p.username === username);
    if (guesser) guesser.score += guesserPoints;
    if (drawer) drawer.score += 15;

    io.to(room.roomId).emit("correct_guess", {
      username,
      points: guesserPoints,
      scores: room.players.map(({ username, score }) => ({ username, score })),
    });

    const eligiblePlayers = room.players.filter(
      (p) => p.connected && p.username !== drawer?.username
    );
    if (room.correctGuessers.size >= eligiblePlayers.length) {
      endTurn(room, io);
    }
  } else if (!isCorrect) {
    io.to(room.roomId).emit("receive_message", { username, text, isCorrect: false });
  }
}

module.exports = {
  createRoom, getRoom, deleteRoom,
  addPlayer, removePlayer, getDrawer,
  startTurn, beginTurn, endTurn,
  endGame, resetRoom, playAgain,
  handleGuess, syncLateJoiner,
};