// src/components/Scoreboard.jsx
import { Users, Pencil, WifiOff, Trophy } from "lucide-react";

const T = {
  surface: "#222840", surfaceHi: "#2a3150", border: "#343d5c",
  accent: "#f59e0b", text: "#f0ede8", muted: "#8b92ab",
  green: "#34d399", red: "#f87171",
};
const medals = [T.accent, "#94a3b8", "#cd7f32"];

export default function Scoreboard({ players, currentDrawer, isMobile }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div style={{
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
        <Users size={13} /> PLAYERS ({players.length})
      </div>

      {/* Mobile: horizontal chips */}
      {isMobile ? (
        <div style={{ display: "flex", overflowX: "auto", padding: "10px 10px", gap: 8 }}>
          {sorted.map((p, i) => (
            <div key={p.username} style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              background: p.username === currentDrawer ? `${T.accent}18` : T.surfaceHi,
              border: `1.5px solid ${p.username === currentDrawer ? T.accent + "55" : T.border}`,
              borderRadius: 10, padding: "8px 12px", minWidth: 72, flexShrink: 0,
              opacity: p.connected === false ? 0.4 : 1,
            }}>
              <Trophy size={14} color={i < 3 ? medals[i] : T.muted} />
              <span style={{
                fontSize: 11, fontWeight: 600, marginTop: 4, color: T.text,
                maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {p.username}
              </span>
              {p.username === currentDrawer && <Pencil size={10} color={T.accent} style={{ marginTop: 2 }} />}
              <span style={{ fontSize: 13, fontWeight: 800, color: T.accent, marginTop: 2 }}>{p.score}</span>
            </div>
          ))}
        </div>
      ) : (
        // Desktop: vertical list
        <div style={{ padding: "6px 0" }}>
          {sorted.map((p, i) => (
            <div key={p.username} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 14px",
              background: p.username === currentDrawer ? `${T.accent}12` : "transparent",
              borderLeft: p.username === currentDrawer ? `3px solid ${T.accent}` : "3px solid transparent",
              opacity: p.connected === false ? 0.4 : 1,
              transition: "background 0.2s",
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Trophy size={13} color={i < 3 ? medals[i] : T.muted} />
                <span style={{ fontSize: 14, fontWeight: p.username === currentDrawer ? 700 : 400, color: T.text }}>
                  {p.username}
                </span>
                {p.username === currentDrawer && <Pencil size={11} color={T.accent} />}
                {p.connected === false && <WifiOff size={11} color={T.red} />}
              </span>
              <span style={{ fontWeight: 800, color: T.accent, fontSize: 14 }}>{p.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}