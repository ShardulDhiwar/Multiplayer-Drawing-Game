// src/App.jsx
import { useState, useEffect } from "react";
import { useGame } from "./hooks/useGame";
import DrawingCanvas from "./components/DrawingCanvas";
import ChatBox from "./components/ChatBox";
import Scoreboard from "./components/Scoreboard";

// ── Responsive hook ───────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 700);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

// ── Lobby Screen ──────────────────────────────────────────────
function LobbyScreen({ onCreate, onJoin, error }) {
  const [name, setName] = useState("");
  const [joinId, setJoinId] = useState("");
  const [mode, setMode] = useState("choose");

  return (
    <div style={styles.centered}>
      <div style={styles.card}>
        <h1 style={{ textAlign: "center", color: "#6366f1", marginBottom: 4, fontSize: "clamp(20px, 5vw, 28px)" }}>
          🎨 Skribbl Clone
        </h1>
        <p style={{ textAlign: "center", color: "#6b7280", marginBottom: 24, fontSize: 14 }}>
          Draw, guess, and have fun!
        </p>

        {error && <div style={styles.error}>{error}</div>}

        {mode === "choose" && (
          <div style={{ display: "flex", gap: 12, flexDirection: "column" }}>
            <button style={styles.primaryBtn} onClick={() => setMode("create")}>🏠 Create Room</button>
            <button style={styles.secondaryBtn} onClick={() => setMode("join")}>🚪 Join Room</button>
          </div>
        )}

        {mode === "create" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input style={styles.input} placeholder="Your username" value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onCreate(name)} />
            <button style={styles.primaryBtn} onClick={() => onCreate(name)}>Create & Enter</button>
            <button style={styles.link} onClick={() => setMode("choose")}>← Back</button>
          </div>
        )}

        {mode === "join" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input style={styles.input} placeholder="Your username" value={name}
              onChange={(e) => setName(e.target.value)} />
            <input style={styles.input} placeholder="Room code (e.g. AB1C2D)"
              value={joinId} onChange={(e) => setJoinId(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && onJoin(name, joinId)} />
            <button style={styles.primaryBtn} onClick={() => onJoin(name, joinId)}>Join Room</button>
            <button style={styles.link} onClick={() => setMode("choose")}>← Back</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Waiting Room Screen ────────────────────────────────────────
function WaitingRoomScreen({ roomId, players, username, onStart, error }) {
  const isHost = players[0]?.username === username;

  return (
    <div style={styles.centered}>
      <div style={styles.card}>
        <h2 style={{ color: "#6366f1", marginBottom: 4, fontSize: "clamp(16px, 4vw, 22px)" }}>
          🏠 Room: <span style={{ fontFamily: "monospace", letterSpacing: 2 }}>{roomId}</span>
        </h2>
        <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>Share this code with friends!</p>

        {error && <div style={styles.error}>{error}</div>}

        <div style={{ margin: "16px 0" }}>
          {players.map((p) => (
            <div key={p.username} style={{ padding: "8px 0", borderBottom: "1px solid #f3f4f6", fontSize: 15, display: "flex", justifyContent: "space-between" }}>
              <span>{p.username}</span>
              {p.username === username && <span style={{ color: "#6366f1", fontSize: 12, fontWeight: 600 }}>YOU</span>}
            </div>
          ))}
        </div>

        {isHost ? (
          <button style={{ ...styles.primaryBtn, opacity: players.length < 2 ? 0.5 : 1 }}
            onClick={onStart} disabled={players.length < 2}>
            {players.length < 2 ? "Waiting for players…" : "▶️ Start Game"}
          </button>
        ) : (
          <p style={{ color: "#6b7280", textAlign: "center", fontSize: 14 }}>Waiting for host to start…</p>
        )}
      </div>
    </div>
  );
}

// ── Game Screen ────────────────────────────────────────────────
function GameScreen({ username, players, messages, gameState, actions }) {
  const isMobile = useIsMobile();
  const isDrawer = gameState.drawer === username;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? 8 : 16 }}>

      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "#6366f1", color: "#fff", borderRadius: 12,
        padding: isMobile ? "8px 12px" : "10px 20px", marginBottom: 10, gap: 8,
      }}>
        <span style={{ fontWeight: 700, fontSize: isMobile ? 12 : 15, whiteSpace: "nowrap" }}>
          {gameState.round}/{gameState.maxRounds}
        </span>

        {/* Word display */}
        <div style={{ textAlign: "center", flex: 1 }}>
          {gameState.myWord ? (
            <div>
              <div style={{ fontSize: 10, opacity: 0.8, marginBottom: 2 }}>YOUR WORD</div>
              <span style={{
                fontSize: isMobile ? 16 : 22, fontWeight: 900, letterSpacing: 2,
                background: "#fff", color: "#6366f1",
                padding: "2px 10px", borderRadius: 8, display: "inline-block",
              }}>
                {gameState.myWord}
              </span>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 10, opacity: 0.8, marginBottom: 2 }}>GUESS THE WORD</div>
              <span style={{ fontFamily: "monospace", fontSize: isMobile ? 16 : 22, letterSpacing: isMobile ? 4 : 6 }}>
                {gameState.hint || "_ ".repeat(gameState.wordLength || 5)}
              </span>
            </div>
          )}
        </div>

        {/* Timer */}
        <div style={{
          width: isMobile ? 38 : 52, height: isMobile ? 38 : 52, borderRadius: "50%", flexShrink: 0,
          background: gameState.timeLeft <= 10 ? "#ef4444" : "#4f46e5",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: isMobile ? 14 : 18, fontWeight: 800,
        }}>
          {gameState.timeLeft}
        </div>
      </div>

      {/* Main layout — side by side on desktop, stacked on mobile */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 220px",
        gap: 10,
      }}>

        {/* Left: Canvas + Chat */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
          <DrawingCanvas isDrawer={isDrawer} />
          <div style={{ height: isMobile ? 180 : 220 }}>
            <ChatBox messages={messages} onSend={actions.sendMessage} isDrawer={isDrawer} />
          </div>
        </div>

        {/* Right: Scoreboard — below canvas on mobile */}
        <Scoreboard players={players} currentDrawer={gameState.drawer} isMobile={isMobile} />
      </div>

      {isDrawer && (
        <div style={{
          marginTop: 10, padding: "8px 14px",
          background: "#ede9fe", borderRadius: 8, fontSize: 13, color: "#4f46e5",
        }}>
          ✏️ You are drawing! Others are guessing your word.
        </div>
      )}
    </div>
  );
}

// ── End Screen ─────────────────────────────────────────────────
function EndScreen({ players }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <div style={styles.centered}>
      <div style={styles.card}>
        <h2 style={{ color: "#6366f1", textAlign: "center", marginBottom: 16 }}>🏆 Game Over!</h2>
        {sorted.map((p, i) => (
          <div key={p.username} style={{
            display: "flex", justifyContent: "space-between",
            padding: "10px 0", borderBottom: "1px solid #f3f4f6", fontSize: 15,
          }}>
            <span>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`} {p.username}</span>
            <strong style={{ color: "#6366f1" }}>{p.score} pts</strong>
          </div>
        ))}
        <button style={{ ...styles.primaryBtn, marginTop: 20 }} onClick={() => window.location.reload()}>
          Play Again
        </button>
      </div>
    </div>
  );
}

// ── Root ────────────────────────────────────────────────────────
export default function App() {
  const { screen, roomId, username, players, messages, gameState, error, actions } = useGame();

  return (
    <div style={{ minHeight: "100vh", background: "#f5f3ff", fontFamily: "system-ui, sans-serif" }}>
      {screen === "lobby" && <LobbyScreen onCreate={actions.createRoom} onJoin={actions.joinRoom} error={error} />}
      {screen === "room" && (
        <WaitingRoomScreen roomId={roomId} players={players} username={username} onStart={actions.startGame} error={error} />
      )}
      {screen === "game" && (
        <GameScreen username={username} players={players} messages={messages} gameState={gameState} actions={actions} />
      )}
      {screen === "end" && <EndScreen players={players} />}

      {error && screen === "game" && (
        <div style={{ ...styles.error, position: "fixed", top: 12, right: 12, left: 12, maxWidth: 360, margin: "0 auto", zIndex: 999 }}>
          {error}
        </div>
      )}
    </div>
  );
}

const styles = {
  centered: {
    minHeight: "100vh", display: "flex",
    alignItems: "center", justifyContent: "center", padding: 16,
  },
  card: {
    background: "#fff", borderRadius: 16, padding: "28px 24px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)", width: "100%", maxWidth: 420,
  },
  primaryBtn: {
    width: "100%", padding: "13px 0", borderRadius: 8,
    background: "#6366f1", color: "#fff", border: "none",
    fontWeight: 700, fontSize: 15, cursor: "pointer",
  },
  secondaryBtn: {
    width: "100%", padding: "13px 0", borderRadius: 8,
    background: "#ede9fe", color: "#6366f1", border: "none",
    fontWeight: 700, fontSize: 15, cursor: "pointer",
  },
  input: {
    width: "100%", padding: "12px", borderRadius: 8,
    border: "1.5px solid #e5e7eb", fontSize: 16, // 16px prevents iOS zoom
    outline: "none", boxSizing: "border-box", color: "#111",
  },
  error: {
    background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5",
    borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 12,
  },
  link: {
    background: "none", border: "none", color: "#6b7280",
    cursor: "pointer", fontSize: 14, textAlign: "center", padding: "4px 0",
  },
};