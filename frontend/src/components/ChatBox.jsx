// src/components/ChatBox.jsx
import { useState, useEffect, useRef } from "react";

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

  const msgColor = (msg) => {
    if (msg.type === "correct") return "#16a34a";
    if (msg.type === "system") return "#6b7280";
    return "#111";
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100%", background: "#f9fafb",
      border: "2px solid #e5e7eb", borderRadius: 12, overflow: "hidden",
    }}>
      <div style={{ padding: "8px 12px", background: "#6366f1", color: "#fff", fontWeight: 700, fontSize: 14 }}>
        💬 Chat & Guesses
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ fontSize: 13, color: msgColor(msg), wordBreak: "break-word" }}>
            {msg.type === "chat" && <><strong>{msg.username}:</strong> {msg.text}</>}
            {msg.type === "correct" && <em>{msg.text}</em>}
            {msg.type === "system" && <em style={{ opacity: 0.7 }}>{msg.text}</em>}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} style={{ display: "flex", borderTop: "1px solid #e5e7eb", flexShrink: 0 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isDrawer ? "You're drawing!" : "Type your guess…"}
          disabled={isDrawer}
          style={{
            flex: 1, padding: "12px", border: "none", outline: "none",
            background: isDrawer ? "#f3f4f6" : "#fff",
            color: "#111", fontSize: 16, // 16px prevents iOS zoom on focus
            minWidth: 0,
          }}
        />
        <button
          type="submit"
          disabled={isDrawer}
          style={{
            padding: "12px 18px", background: "#6366f1", color: "#fff",
            border: "none", cursor: isDrawer ? "default" : "pointer",
            fontWeight: 700, fontSize: 18, flexShrink: 0,
          }}
        >
          →
        </button>
      </form>
    </div>
  );
}