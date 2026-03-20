// src/hooks/useGame.js
import { useState, useEffect, useCallback, useRef } from "react";
import socket from "../socket";

export function useGame() {
  const [screen, setScreen] = useState("lobby");
  const [roomId, setRoomId] = useState(null);
  const [username, setUsername] = useState("");
  const usernameRef = useRef("");
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [gameState, setGameState] = useState({
    status: "waiting",
    drawer: null,
    wordLength: null,
    hint: null,
    round: 0,
    maxRounds: 3,
    game: 0,
    gamesPerRound: 5,
    timeLeft: 80,
    myWord: null,
    wordChoices: null,
    pickTimeLeft: 15,
  });
  const [error, setError] = useState(null);

  const setMessagesRef = useRef(setMessages);
  const addMessage = useCallback((msg) => {
    setMessagesRef.current((prev) => [...prev.slice(-100), msg]);
  }, []);

  // canvas_sync callback — set by DrawingCanvas via ref
  const canvasSyncRef = useRef(null);

  useEffect(() => {
    socket.connect();

    socket.on("player_joined", ({ username, players }) => {
      addMessage({ type: "system", text: `${username} joined` });
      setPlayers(players);
    });

    socket.on("player_disconnected", ({ username, players }) => {
      addMessage({ type: "system", text: `${username} disconnected` });
      setPlayers(players);
    });

    socket.on("choose_word", ({ choices, timeLeft, round, maxRounds, game, gamesPerRound }) => {
      setScreen("game");
      setGameState((g) => ({
        ...g,
        status: "choosing",
        drawer: usernameRef.current,
        wordChoices: choices,
        pickTimeLeft: timeLeft,
        round, maxRounds, game, gamesPerRound,
        myWord: null, hint: null,
      }));
    });

    socket.on("waiting_for_word", ({ drawer, round, maxRounds, game, gamesPerRound }) => {
      setScreen("game");
      setGameState((g) => ({
        ...g,
        status: "choosing",
        drawer, round, maxRounds, game, gamesPerRound,
        wordChoices: null, myWord: null, hint: null,
      }));
    });

    socket.on("start_round", ({ drawer, wordLength, hint, round, maxRounds, game, gamesPerRound, timeLeft, myWord }) => {
      setScreen("game");
      setGameState((g) => ({
        ...g,
        status: "playing",
        drawer, wordLength, hint, round, maxRounds, game, gamesPerRound, timeLeft,
        myWord: myWord || null,
        wordChoices: null,
      }));
      addMessage({ type: "system", text: `Round ${round}/${maxRounds} · Turn ${game}/${gamesPerRound} – ${drawer} is drawing!` });
    });

    // Late-join: restore canvas to current state
    socket.on("canvas_sync", ({ dataUrl }) => {
      if (canvasSyncRef.current) canvasSyncRef.current(dataUrl);
    });

    socket.on("hint_update", ({ hint }) => {
      setGameState((g) => ({ ...g, hint }));
    });

    socket.on("timer_tick", ({ timeLeft }) => {
      setGameState((g) => ({ ...g, timeLeft }));
    });

    socket.on("receive_message", ({ username, text }) => {
      addMessage({ type: "chat", username, text });
    });

    socket.on("correct_guess", ({ username, points, scores }) => {
      addMessage({ type: "correct", text: `🎉 ${username} guessed correctly! (+${points} pts)` });
      setPlayers(scores);
    });

    socket.on("round_ended", ({ word, scores }) => {
      addMessage({ type: "system", text: `Turn ended! The word was "${word}"` });
      setPlayers(scores);
      setGameState((g) => ({ ...g, status: "between_rounds", myWord: null }));
    });

    socket.on("end_game", ({ finalScores }) => {
      setPlayers(finalScores);
      setScreen("end");
    });

    socket.on("play_again_starting", ({ players }) => {
      setPlayers(players);
      setMessages([]);
      setGameState({
        status: "waiting",
        drawer: null, wordLength: null, hint: null,
        round: 0, maxRounds: 3, game: 0, gamesPerRound: 5,
        timeLeft: 80, myWord: null, wordChoices: null, pickTimeLeft: 15,
      });
      setScreen("restarting");
    });

    socket.on("waiting_for_players", () => {
      setScreen("waiting");
    });

    socket.on("error_msg", ({ message }) => {
      setError(message);
      setTimeout(() => setError(null), 3000);
    });

    socket.on("connect_error", () => setError("Connection lost. Retrying…"));
    socket.on("connect", () => setError(null));

    return () => socket.removeAllListeners();
  }, []);

  // ── Actions ───────────────────────────────────────────────
  const createRoom = useCallback((name) => {
    setUsername(name);
    usernameRef.current = name;
    socket.emit("create_room", { username: name }, (res) => {
      if (res.success) {
        setRoomId(res.roomId);
        setPlayers(res.players);
        // screen will be set by waiting_for_players or start_round from server
      } else {
        setError(res.error);
      }
    });
  }, []);

  const joinRoom = useCallback((name, id) => {
    setUsername(name);
    usernameRef.current = name;
    socket.emit("join_room", { username: name, roomId: id }, (res) => {
      if (res.success) {
        setRoomId(res.roomId);
        setPlayers(res.players);
        setScreen("game"); // go straight to game, syncLateJoiner handles the rest
      } else {
        setError(res.error);
      }
    });
  }, []);

  const playAgain = useCallback(() => socket.emit("play_again"), []);
  const sendMessage = useCallback((text) => socket.emit("send_message", { text }), []);
  const sendStroke = useCallback((stroke) => socket.emit("draw", stroke), []);
  const clearCanvas = useCallback(() => socket.emit("clear_canvas"), []);
  const pickWord = useCallback((word) => socket.emit("pick_word", { word }), []);

  // Called by DrawingCanvas to register its sync callback
  const registerCanvasSync = useCallback((fn) => { canvasSyncRef.current = fn; }, []);

  // Called by DrawingCanvas to push a snapshot to the server (for late joiners)
  const sendCanvasSnapshot = useCallback((dataUrl) => {
    socket.emit("canvas_snapshot", { dataUrl });
  }, []);

  return {
    screen, roomId, username, players, messages, gameState, error,
    actions: {
      createRoom, joinRoom, playAgain,
      sendMessage, sendStroke, clearCanvas, pickWord,
      registerCanvasSync, sendCanvasSnapshot,
    },
  };
}