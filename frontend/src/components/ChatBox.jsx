// src/components/ChatBox.jsx
import { useState, useEffect, useRef } from "react";
import { Send, MessageSquare } from "lucide-react";

const T = {
  bg: "#1a1f2e", surface: "#222840", surfaceHi: "#2a3150",
  border: "#343d5c", accent: "#f59e0b", green: "#34d399",
  text: "#f0ede8", muted: "#8b92ab", red: "#f87171",
  fontDisplay: "'Caveat', cursive",
};

export default function ChatBox({ messages, onSend, isDrawer }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: T.surface, border: `1.5px solid ${T.border}`,
      borderRadius: 14, overflow: "hidden",
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
    }}>
      {/* Header */}
      <div style={{
        padding: "9px 14px", background: T.surfaceHi,
        borderBottom: `1px solid ${T.border}`,
        display: "flex", alignItems: "center", gap: 7,
        color: T.muted, fontSize: 12, fontWeight: 700, letterSpacing: 1,
      }}>
        <MessageSquare size={13} /> CHAT & GUESSES
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
        {messages.length === 0 && (
          <div style={{ color: T.muted, fontSize: 13, textAlign: "center", marginTop: 16, opacity: 0.6 }}>
            No messages yet…
          </div>
        )}
        {messages.map((msg, i) => {
          if (msg.type === "system") return (
            <div key={i} style={{
              fontSize: 12, color: T.muted, textAlign: "center",
              padding: "3px 8px", fontStyle: "italic",
            }}>
              {msg.text}
            </div>
          );
          if (msg.type === "correct") return (
            <div key={i} style={{
              fontSize: 13, color: T.green,
              background: `${T.green}15`, border: `1px solid ${T.green}33`,
              borderRadius: 8, padding: "5px 10px", fontWeight: 600,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              ✓ {msg.text}
            </div>
          );
          return (
            <div key={i} style={{ fontSize: 13, wordBreak: "break-word" }}>
              <span style={{ color: T.accent, fontWeight: 700 }}>{msg.username}: </span>
              <span style={{ color: T.text }}>{msg.text}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{
        display: "flex", borderTop: `1px solid ${T.border}`, flexShrink: 0,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={isDrawer ? "You are drawing…" : "Type your guess…"}
          disabled={isDrawer}
          style={{
            flex: 1, padding: "11px 14px", border: "none", outline: "none",
            background: isDrawer ? T.surfaceHi : T.bg,
            color: T.text, fontSize: 16, fontFamily: "inherit",
            minWidth: 0,
          }}
        />
        <button type="submit" disabled={isDrawer} style={{
          padding: "11px 16px", background: isDrawer ? T.surfaceHi : T.accent,
          color: isDrawer ? T.muted : "#1a1f2e",
          border: "none", cursor: isDrawer ? "default" : "pointer",
          flexShrink: 0, transition: "background 0.2s",
          display: "flex", alignItems: "center",
        }}>
          <Send size={16} strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}