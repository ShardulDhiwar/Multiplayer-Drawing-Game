// src/components/Scoreboard.jsx
export default function Scoreboard({ players, currentDrawer, isMobile }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div style={{
      background: "#f9fafb", border: "2px solid #e5e7eb",
      borderRadius: 12, overflow: "hidden",
    }}>
      <div style={{ padding: "8px 12px", background: "#6366f1", color: "#fff", fontWeight: 700, fontSize: 14 }}>
        🏆 Players
      </div>

      {/* On mobile: horizontal scrolling row of player chips */}
      {isMobile ? (
        <div style={{ display: "flex", overflowX: "auto", padding: "8px 10px", gap: 8 }}>
          {sorted.map((p, i) => (
            <div key={p.username} style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              background: p.username === currentDrawer ? "#ede9fe" : "#fff",
              border: "1.5px solid #e5e7eb", borderRadius: 10,
              padding: "6px 12px", minWidth: 70, flexShrink: 0,
              opacity: p.connected === false ? 0.4 : 1,
            }}>
              <span style={{ fontSize: 16 }}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, marginTop: 2, maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.username}{p.username === currentDrawer ? " ✏️" : ""}
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#6366f1" }}>{p.score}</span>
            </div>
          ))}
        </div>
      ) : (
        // Desktop: vertical list
        <div style={{ padding: "8px 0" }}>
          {sorted.map((p, i) => (
            <div key={p.username} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "6px 14px",
              background: p.username === currentDrawer ? "#ede9fe" : "transparent",
              opacity: p.connected === false ? 0.4 : 1,
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 20, fontSize: 13, color: "#9ca3af" }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                </span>
                <span style={{ fontWeight: p.username === currentDrawer ? 700 : 400, fontSize: 14 }}>
                  {p.username}{p.username === currentDrawer ? " ✏️" : ""}
                  {p.connected === false ? " 🔌" : ""}
                </span>
              </span>
              <span style={{ fontWeight: 700, color: "#6366f1", fontSize: 14 }}>{p.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}