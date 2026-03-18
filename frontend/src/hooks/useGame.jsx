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
    timeLeft: 80,
    myWord: null,
    wordChoices: null,   // only set for drawer during choosing phase
    pickTimeLeft: 15,    // countdown for word selection
  });
  const [error, setError] = useState(null);

  // useRef so addMessage never changes identity → useEffect runs only once
  const setMessagesRef = useRef(setMessages);
  const addMessage = useCallback((msg) => {
    setMessagesRef.current((prev) => [...prev.slice(-100), msg]);
  }, []);

  // ── Connect & register listeners (runs ONCE) ──────────────
  useEffect(() => {
    socket.connect();

    socket.on("player_joined", ({ username, players }) => {
      addMessage({ type: "system", text: `${username} joined the room` });
      setPlayers(players);
    });

    socket.on("player_disconnected", ({ username, players }) => {
      addMessage({ type: "system", text: `${username} disconnected` });
      setPlayers(players);
    });

    // Drawer receives 3 word choices
    socket.on("choose_word", ({ choices, timeLeft, round, maxRounds }) => {
      setScreen("game");
      setGameState((g) => ({
        ...g,
        status: "choosing",
        drawer: usernameRef.current, // drawer is the current user
        wordChoices: choices,
        pickTimeLeft: timeLeft,
        round,
        maxRounds,
        myWord: null,
        hint: null,
      }));
    });

    // Guessers wait while drawer picks
    socket.on("waiting_for_word", ({ drawer, round, maxRounds }) => {
      setScreen("game");
      setGameState((g) => ({
        ...g,
        status: "choosing",
        drawer,
        round,
        maxRounds,
        wordChoices: null,
        myWord: null,
        hint: null,
      }));
    });

    socket.on("start_round", ({ drawer, wordLength, hint, round, maxRounds, timeLeft, myWord }) => {
      setScreen("game");
      setGameState((g) => ({
        ...g,
        status: "playing",
        drawer,
        wordLength,
        hint,
        round,
        maxRounds,
        timeLeft,
        myWord: myWord || null,
        wordChoices: null,
      }));
      addMessage({ type: "system", text: `Round ${round}/${maxRounds} – ${drawer} is drawing!` });
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
      addMessage({
        type: "correct",
        text: `🎉 ${username} guessed correctly! (+${points} pts)`,
      });
      setPlayers(scores);
    });

    socket.on("round_ended", ({ word, scores }) => {
      addMessage({ type: "system", text: `Round ended! The word was "${word}"` });
      setPlayers(scores);
      setGameState((g) => ({ ...g, status: "between_rounds", myWord: null }));
    });

    socket.on("end_game", ({ finalScores }) => {
      setPlayers(finalScores);
      setScreen("end");
    });

    socket.on("error_msg", ({ message }) => {
      setError(message);
      setTimeout(() => setError(null), 3000);
    });

    socket.on("connect_error", () => setError("Connection lost. Retrying…"));
    socket.on("connect", () => setError(null));

    return () => socket.removeAllListeners();
  }, []); // ← empty deps: register once, never re-register

  // ── Actions ───────────────────────────────────────────────
  const createRoom = useCallback((name) => {
    setUsername(name);
    usernameRef.current = name;
    socket.emit("create_room", { username: name }, (res) => {
      if (res.success) {
        setRoomId(res.roomId);
        setPlayers(res.players);
        setScreen("room");
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
        setScreen("room");
      } else {
        setError(res.error);
      }
    });
  }, []);

  const startGame = useCallback(() => {
    socket.emit("start_game");
  }, []);

  const sendMessage = useCallback((text) => {
    socket.emit("send_message", { text });
  }, []);

  const sendStroke = useCallback((stroke) => {
    socket.emit("draw", stroke);
  }, []);

  const clearCanvas = useCallback(() => {
    socket.emit("clear_canvas");
  }, []);

  const pickWord = useCallback((word) => {
    socket.emit("pick_word", { word });
  }, []);

  return {
    screen, roomId, username, players, messages, gameState, error,
    actions: { createRoom, joinRoom, startGame, sendMessage, sendStroke, clearCanvas, pickWord },
  };
}