// src/App.jsx
import { useState, useEffect } from "react";
import { useGame } from "./hooks/useGame";
import DrawingCanvas from "./components/DrawingCanvas";
import ChatBox from "./components/ChatBox";
import Scoreboard from "./components/Scoreboard";
import {
  Home, LogIn, Play, Users, Clock, Trophy, RotateCcw, Pencil, ChevronLeft,
  Wifi, WifiOff, Copy, Check,
} from "lucide-react";

// ── Theme tokens ─────────────────────────────────────────────
const T = {
  bg:       "#1a1f2e",
  surface:  "#222840",
  surfaceHi:"#2a3150",
  border:   "#343d5c",
  accent:   "#f59e0b",   // amber — chalk yellow
  accentDim:"#78450a",
  green:    "#34d399",
  red:      "#f87171",
  blue:     "#60a5fa",
  purple:   "#a78bfa",
  text:     "#f0ede8",
  muted:    "#8b92ab",
  fontDisplay: "'Caveat', cursive",
  fontBody:    "'DM Sans', sans-serif",
};

// ── Responsive hook ───────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 700);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return isMobile;
}

// ── Reusable UI ───────────────────────────────────────────────
function Btn({ children, onClick, variant = "primary", disabled, style = {} }) {
  const base = {
    width: "100%", padding: "13px 0", borderRadius: 10, border: "none",
    fontFamily: T.fontBody, fontWeight: 700, fontSize: 15,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "transform 0.12s, opacity 0.12s",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    opacity: disabled ? 0.45 : 1,
    ...style,
  };
  const variants = {
    primary:   { background: T.accent, color: "#1a1f2e" },
    secondary: { background: T.surfaceHi, color: T.text, border: `1.5px solid ${T.border}` },
    danger:    { background: T.red, color: "#fff" },
    ghost:     { background: "transparent", color: T.muted, border: "none" },
  };
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{ ...base, ...variants[variant] }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {children}
    </button>
  );
}

function Input({ value, onChange, placeholder, onKeyDown, type = "text" }) {
  return (
    <input
      type={type} value={value} onChange={onChange}
      placeholder={placeholder} onKeyDown={onKeyDown}
      style={{
        width: "100%", padding: "12px 14px", borderRadius: 10,
        border: `1.5px solid ${T.border}`, background: T.bg,
        color: T.text, fontSize: 16, outline: "none",
        fontFamily: T.fontBody, boxSizing: "border-box",
        transition: "border-color 0.2s",
      }}
      onFocus={e => { e.target.style.borderColor = T.accent; }}
      onBlur={e => { e.target.style.borderColor = T.border; }}
    />
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: T.surface, borderRadius: 18,
      border: `1.5px solid ${T.border}`,
      boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
      padding: "32px 28px", width: "100%", maxWidth: 420,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Lobby Screen ──────────────────────────────────────────────
function LobbyScreen({ onCreate, onJoin, error }) {
  const [name, setName] = useState("");
  const [joinId, setJoinId] = useState("");
  const [mode, setMode] = useState("choose");

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 420 }} className="fade-up">

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 72, height: 72, borderRadius: 20, background: T.accent,
            marginBottom: 14, boxShadow: `0 0 40px ${T.accent}55`,
          }}>
            <Pencil size={36} color="#1a1f2e" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontFamily: T.fontDisplay, fontSize: 42, color: T.text, lineHeight: 1 }}>
            Skribbl Clone
          </h1>
          <p style={{ color: T.muted, fontSize: 14, marginTop: 6 }}>Draw, guess & have fun!</p>
        </div>

        <Card>
          {error && (
            <div style={{
              background: "#3b1515", color: T.red, border: `1px solid ${T.red}44`,
              borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <WifiOff size={14} /> {error}
            </div>
          )}

          {mode === "choose" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }} className="fade-up">
              <Btn onClick={() => setMode("create")} variant="primary">
                <Home size={16} /> Create Room
              </Btn>
              <Btn onClick={() => setMode("join")} variant="secondary">
                <LogIn size={16} /> Join Room
              </Btn>
            </div>
          )}

          {mode === "create" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }} className="fade-up">
              <label style={{ color: T.muted, fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>USERNAME</label>
              <Input value={name} onChange={e => setName(e.target.value)}
                placeholder="Enter your name"
                onKeyDown={e => e.key === "Enter" && onCreate(name)} />
              <Btn onClick={() => onCreate(name)} variant="primary">
                <Home size={16} /> Create & Enter
              </Btn>
              <Btn onClick={() => setMode("choose")} variant="ghost">
                <ChevronLeft size={15} /> Back
              </Btn>
            </div>
          )}

          {mode === "join" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }} className="fade-up">
              <label style={{ color: T.muted, fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>USERNAME</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" />
              <label style={{ color: T.muted, fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>ROOM CODE</label>
              <Input value={joinId} onChange={e => setJoinId(e.target.value.toUpperCase())}
                placeholder="e.g. AB1C2D"
                onKeyDown={e => e.key === "Enter" && onJoin(name, joinId)} />
              <Btn onClick={() => onJoin(name, joinId)} variant="primary">
                <LogIn size={16} /> Join Room
              </Btn>
              <Btn onClick={() => setMode("choose")} variant="ghost">
                <ChevronLeft size={15} /> Back
              </Btn>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── Waiting Room ──────────────────────────────────────────────
function WaitingRoomScreen({ roomId, players, username, onStart, error }) {
  const isHost = players[0]?.username === username;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <Card className="fade-up">
        {/* Room code badge */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ color: T.muted, fontSize: 12, fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>ROOM CODE</div>
          <div style={{
            fontFamily: T.fontDisplay, fontSize: 40, letterSpacing: 6,
            color: T.accent, background: T.bg, borderRadius: 12,
            padding: "10px 24px", display: "inline-block",
            border: `2px dashed ${T.accentDim}`,
          }}>
            {roomId}
          </div>

          {/* Copy button */}
          <div style={{ marginTop: 12 }}>
            <button onClick={handleCopy} style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "8px 18px", borderRadius: 8, cursor: "pointer",
              background: copied ? `${T.green}20` : T.surfaceHi,
              border: `1.5px solid ${copied ? T.green : T.border}`,
              color: copied ? T.green : T.muted,
              fontSize: 13, fontWeight: 600, fontFamily: T.fontBody,
              transition: "all 0.2s",
            }}>
              {copied
                ? <><Check size={14} /> Copied!</>
                : <><Copy size={14} /> Copy Room Code</>
              }
            </button>
          </div>

          <p style={{ color: T.muted, fontSize: 12, marginTop: 8 }}>Share this code with friends</p>
        </div>

        {error && (
          <div style={{ background: "#3b1515", color: T.red, borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}

        {/* Player list */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.muted, fontSize: 12, fontWeight: 600, letterSpacing: 1, marginBottom: 10 }}>
            <Users size={13} /> PLAYERS ({players.length})
          </div>
          {players.map((p, i) => (
            <div key={p.username} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "9px 12px", borderRadius: 8, marginBottom: 6,
              background: p.username === username ? `${T.accent}18` : T.surfaceHi,
              border: `1px solid ${p.username === username ? T.accent + "44" : T.border}`,
            }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                {i === 0 && <span style={{ color: T.accent, marginRight: 6, fontSize: 12 }}>HOST</span>}
                {p.username}
              </span>
              {p.username === username && (
                <span style={{ fontSize: 11, color: T.accent, fontWeight: 700 }}>YOU</span>
              )}
            </div>
          ))}
        </div>

        {isHost ? (
          <Btn onClick={onStart} disabled={players.length < 2} variant="primary">
            <Play size={16} />
            {players.length < 2 ? "Waiting for players…" : "Start Game"}
          </Btn>
        ) : (
          <div style={{ textAlign: "center", color: T.muted, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green, animation: "pulse-ring 1.5s infinite" }} />
            Waiting for host to start…
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Word Picker Modal ─────────────────────────────────────────
function WordPicker({ choices, onPick, drawer, isDrawer }) {
  const [pickTimer, setPickTimer] = useState(15);

  useEffect(() => {
    const interval = setInterval(() => setPickTimer(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(interval);
  }, []);

  // Overlay for everyone
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(10,12,20,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(4px)",
      padding: 16,
    }}>
      <div style={{
        background: T.surface, border: `1.5px solid ${T.border}`,
        borderRadius: 20, padding: "32px 28px", maxWidth: 440, width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        textAlign: "center",
      }} className="pop">

        {isDrawer ? (
          <>
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 52, height: 52, borderRadius: 14, background: `${T.accent}22`,
              border: `2px solid ${T.accent}55`, marginBottom: 16,
            }}>
              <Pencil size={24} color={T.accent} />
            </div>
            <h2 style={{ fontFamily: T.fontDisplay, fontSize: 30, color: T.text, marginBottom: 6 }}>
              Pick a word to draw!
            </h2>
            <p style={{ color: T.muted, fontSize: 13, marginBottom: 24 }}>
              You have <span style={{ color: pickTimer <= 5 ? T.red : T.accent, fontWeight: 700 }}>{pickTimer}s</span> to choose
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {choices.map((word) => (
                <button key={word} onClick={() => onPick(word)} style={{
                  padding: "14px 20px", borderRadius: 12, cursor: "pointer",
                  background: T.surfaceHi, border: `1.5px solid ${T.border}`,
                  color: T.text, fontSize: 20, fontFamily: T.fontDisplay,
                  fontWeight: 600, letterSpacing: 1,
                  transition: "all 0.15s",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = `${T.accent}22`;
                    e.currentTarget.style.borderColor = T.accent;
                    e.currentTarget.style.color = T.accent;
                    e.currentTarget.style.transform = "translateX(4px)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = T.surfaceHi;
                    e.currentTarget.style.borderColor = T.border;
                    e.currentTarget.style.color = T.text;
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  <span>{word}</span>
                  <span style={{ fontSize: 13, color: T.muted }}>{word.length} letters</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 52, height: 52, borderRadius: 14, background: `${T.blue}22`,
              border: `2px solid ${T.blue}55`, marginBottom: 16,
            }}>
              <Clock size={24} color={T.blue} />
            </div>
            <h2 style={{ fontFamily: T.fontDisplay, fontSize: 28, color: T.text, marginBottom: 8 }}>
              {drawer} is choosing a word…
            </h2>
            <p style={{ color: T.muted, fontSize: 14 }}>Get ready to guess!</p>
            <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 6 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 10, height: 10, borderRadius: "50%", background: T.accent,
                  animation: `pulse-ring 1.2s ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Game Screen ───────────────────────────────────────────────
function GameScreen({ username, players, messages, gameState, actions }) {
  const isMobile = useIsMobile();
  const isDrawer = gameState.drawer === username;
  const timerDanger = gameState.timeLeft <= 10;

  return (
    <div style={{ maxWidth: 1140, margin: "0 auto", padding: isMobile ? 8 : "12px 16px" }}>

      {/* Word picker modal — shown during choosing phase */}
      {gameState.status === "choosing" && (
        <WordPicker
          choices={gameState.wordChoices}
          onPick={actions.pickWord}
          drawer={gameState.drawer}
          isDrawer={isDrawer}
        />
      )}

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: T.surface, borderRadius: 14,
        border: `1.5px solid ${T.border}`,
        padding: isMobile ? "8px 12px" : "10px 20px",
        marginBottom: 10, gap: 8,
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}>

        {/* Round badge */}
        <div style={{
          background: T.surfaceHi, borderRadius: 8, padding: "4px 10px",
          fontSize: isMobile ? 11 : 13, fontWeight: 700, color: T.muted,
          border: `1px solid ${T.border}`, whiteSpace: "nowrap", flexShrink: 0,
        }}>
          Round {gameState.round}/{gameState.maxRounds}
        </div>

        {/* Word */}
        <div style={{ flex: 1, textAlign: "center" }}>
          {gameState.myWord ? (
            <div>
              <div style={{ fontSize: 10, color: T.muted, letterSpacing: 1, marginBottom: 3 }}>YOUR WORD</div>
              <span style={{
                fontFamily: T.fontDisplay, fontSize: isMobile ? 22 : 30,
                fontWeight: 700, color: T.accent,
                background: `${T.accent}18`, padding: "2px 16px",
                borderRadius: 8, border: `1.5px solid ${T.accent}44`,
                display: "inline-block",
              }}>
                {gameState.myWord}
              </span>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 10, color: T.muted, letterSpacing: 1, marginBottom: 3 }}>GUESS THE WORD</div>
              <span style={{
                fontFamily: T.fontDisplay, fontSize: isMobile ? 20 : 28,
                letterSpacing: isMobile ? 6 : 10, color: T.text,
              }}>
                {gameState.hint || "_ ".repeat(gameState.wordLength || 5)}
              </span>
            </div>
          )}
        </div>

        {/* Timer */}
        <div style={{
          width: isMobile ? 40 : 50, height: isMobile ? 40 : 50,
          borderRadius: "50%", flexShrink: 0,
          background: timerDanger ? `${T.red}22` : T.surfaceHi,
          border: `2.5px solid ${timerDanger ? T.red : T.border}`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          transition: "border-color 0.3s, background 0.3s",
          boxShadow: timerDanger ? `0 0 16px ${T.red}55` : "none",
        }}>
          <Clock size={isMobile ? 10 : 12} color={timerDanger ? T.red : T.muted} />
          <span style={{ fontSize: isMobile ? 13 : 15, fontWeight: 800, color: timerDanger ? T.red : T.text, lineHeight: 1 }}>
            {gameState.timeLeft}
          </span>
        </div>
      </div>

      {/* ── Drawer banner ── */}
      {isDrawer && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: `${T.accent}15`, border: `1px solid ${T.accent}44`,
          borderRadius: 10, padding: "8px 14px", marginBottom: 10,
          fontSize: 13, color: T.accent, fontWeight: 600,
        }}>
          <Pencil size={14} /> You are drawing! Others are guessing your word.
        </div>
      )}

      {/* ── Main layout ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 230px",
        gap: 10,
      }}>
        {/* Canvas + Chat */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
          <DrawingCanvas isDrawer={isDrawer} />
          <div style={{ height: isMobile ? 190 : 230 }}>
            <ChatBox messages={messages} onSend={actions.sendMessage} isDrawer={isDrawer} />
          </div>
        </div>

        {/* Scoreboard */}
        <Scoreboard players={players} currentDrawer={gameState.drawer} isMobile={isMobile} />
      </div>
    </div>
  );
}

// ── End Screen ────────────────────────────────────────────────
function EndScreen({ players }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const medals = [T.accent, T.muted, "#cd7f32"];

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <Card className="pop" style={{ textAlign: "center" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 64, height: 64, borderRadius: 18, background: `${T.accent}22`,
          border: `2px solid ${T.accent}55`, marginBottom: 16,
        }}>
          <Trophy size={30} color={T.accent} />
        </div>
        <h2 style={{ fontFamily: T.fontDisplay, fontSize: 36, color: T.text, marginBottom: 20 }}>
          Game Over!
        </h2>

        {sorted.map((p, i) => (
          <div key={p.username} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "11px 14px", borderRadius: 10, marginBottom: 8,
            background: i === 0 ? `${T.accent}18` : T.surfaceHi,
            border: `1px solid ${i === 0 ? T.accent + "44" : T.border}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Trophy size={16} color={i < 3 ? medals[i] : T.muted} />
              <span style={{ fontWeight: i === 0 ? 700 : 500, fontSize: 15 }}>{p.username}</span>
            </div>
            <span style={{ fontWeight: 800, color: i === 0 ? T.accent : T.muted, fontSize: 15 }}>
              {p.score} pts
            </span>
          </div>
        ))}

        <div style={{ marginTop: 20 }}>
          <Btn onClick={() => window.location.reload()} variant="primary">
            <RotateCcw size={15} /> Play Again
          </Btn>
        </div>
      </Card>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────
export default function App() {
  const { screen, roomId, username, players, messages, gameState, error, actions } = useGame();

  return (
    <div style={{ minHeight: "100vh", fontFamily: T.fontBody }}>
      {screen === "lobby" && <LobbyScreen onCreate={actions.createRoom} onJoin={actions.joinRoom} error={error} />}
      {screen === "room" && (
        <WaitingRoomScreen roomId={roomId} players={players} username={username} onStart={actions.startGame} error={error} />
      )}
      {screen === "game" && (
        <GameScreen username={username} players={players} messages={messages} gameState={gameState} actions={actions} />
      )}
      {screen === "end" && <EndScreen players={players} />}

      {error && screen === "game" && (
        <div style={{
          position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)",
          background: "#3b1515", color: T.red, border: `1px solid ${T.red}44`,
          borderRadius: 10, padding: "10px 18px", fontSize: 13, zIndex: 999,
          display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}>
          <WifiOff size={14} /> {error}
        </div>
      )}
    </div>
  );
}