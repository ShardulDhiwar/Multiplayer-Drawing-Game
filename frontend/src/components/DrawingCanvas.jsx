// src/components/DrawingCanvas.jsx
import { useRef, useEffect, useState, useCallback } from "react";
import { Eraser, Trash2, Pencil } from "lucide-react";
import socket from "../socket";

const T = {
  surface: "#222840", surfaceHi: "#2a3150", border: "#343d5c",
  accent: "#f59e0b", text: "#f0ede8", muted: "#8b92ab", red: "#f87171",
};

const COLORS = [
  "#f0ede8", "#f87171", "#fb923c", "#fbbf24",
  "#34d399", "#60a5fa", "#a78bfa", "#f472b6",
  "#1a1f2e",
];
const SIZES = [2, 5, 10, 20];

export default function DrawingCanvas({ isDrawer }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef(null);
  const [color, setColor] = useState("#f0ede8");
  const [size, setSize] = useState(5);
  const [tool, setTool] = useState("pen");

  const clearCtx = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }, []);

  const drawStroke = (ctx, { x1, y1, x2, y2, color, size, tool }) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = tool === "eraser" ? "#1a1f2e" : color;
    ctx.lineWidth = tool === "eraser" ? size * 3 : size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  useEffect(() => {
    socket.on("start_round", clearCtx);
    socket.on("clear_canvas", clearCtx);
    const onDraw = (stroke) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) drawStroke(ctx, stroke);
    };
    socket.on("draw", onDraw);
    return () => {
      socket.off("start_round", clearCtx);
      socket.off("clear_canvas", clearCtx);
      socket.off("draw", onDraw);
    };
  }, [clearCtx]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches?.[0];
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const onPointerDown = useCallback((e) => {
    if (!isDrawer) return;
    isDrawing.current = true;
    lastPos.current = getPos(e);
  }, [isDrawer]);

  const onPointerMove = useCallback((e) => {
    if (!isDrawer || !isDrawing.current) return;
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    const stroke = { x1: lastPos.current.x, y1: lastPos.current.y, x2: pos.x, y2: pos.y, color, size, tool };
    drawStroke(ctx, stroke);
    socket.emit("draw", stroke);
    lastPos.current = pos;
  }, [isDrawer, color, size, tool]);

  const onPointerUp = useCallback(() => {
    isDrawing.current = false;
    lastPos.current = null;
  }, []);

  const handleClear = () => {
    clearCtx();
    socket.emit("clear_canvas");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

      {/* Toolbar */}
      {isDrawer && (
        <div style={{
          display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap",
          background: T.surface, border: `1.5px solid ${T.border}`,
          borderRadius: 12, padding: "8px 12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}>
          {/* Colors */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {COLORS.map((c) => (
              <button key={c} onClick={() => { setColor(c); setTool("pen"); }}
                style={{
                  width: 26, height: 26, borderRadius: "50%", background: c,
                  border: color === c && tool === "pen"
                    ? `3px solid ${T.accent}`
                    : "2px solid rgba(255,255,255,0.15)",
                  cursor: "pointer", transition: "transform 0.1s",
                  transform: color === c && tool === "pen" ? "scale(1.2)" : "scale(1)",
                  flexShrink: 0,
                }}
              />
            ))}
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 26, background: T.border, flexShrink: 0 }} />

          {/* Brush sizes */}
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {SIZES.map((s) => (
              <button key={s} onClick={() => setSize(s)} style={{
                width: 30, height: 30, borderRadius: 8,
                background: size === s ? `${T.accent}22` : T.surfaceHi,
                border: `1.5px solid ${size === s ? T.accent : T.border}`,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.1s", flexShrink: 0,
              }}>
                <span style={{
                  width: Math.min(s + 2, 18), height: Math.min(s + 2, 18),
                  borderRadius: "50%", background: size === s ? T.accent : T.muted,
                  display: "block", transition: "all 0.1s",
                }} />
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 26, background: T.border, flexShrink: 0 }} />

          {/* Eraser */}
          <button onClick={() => setTool("eraser")} style={{
            padding: "5px 10px", borderRadius: 8, cursor: "pointer",
            background: tool === "eraser" ? `${T.accent}22` : T.surfaceHi,
            border: `1.5px solid ${tool === "eraser" ? T.accent : T.border}`,
            color: tool === "eraser" ? T.accent : T.muted,
            display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
            transition: "all 0.15s", flexShrink: 0,
          }}>
            <Eraser size={14} /> Eraser
          </button>

          {/* Clear */}
          <button onClick={handleClear} style={{
            padding: "5px 10px", borderRadius: 8, cursor: "pointer",
            background: `${T.red}18`, border: `1.5px solid ${T.red}55`,
            color: T.red, display: "flex", alignItems: "center", gap: 5,
            fontSize: 12, fontWeight: 600, transition: "all 0.15s", flexShrink: 0,
          }}>
            <Trash2 size={14} /> Clear
          </button>

          {/* Active tool indicator */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, color: T.muted, fontSize: 12 }}>
            <Pencil size={12} />
            <span style={{ color: T.accent, fontWeight: 600 }}>
              {tool === "eraser" ? "Eraser" : "Pen"}
            </span>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div style={{
        borderRadius: 14, overflow: "hidden",
        border: `1.5px solid ${T.border}`,
        boxShadow: isDrawer ? `0 0 0 2px ${T.accent}33, 0 8px 30px rgba(0,0,0,0.4)` : "0 8px 30px rgba(0,0,0,0.4)",
        transition: "box-shadow 0.3s",
      }}>
        <canvas
          ref={canvasRef}
          width={700} height={450}
          style={{
            background: "#1a1f2e",
            display: "block",
            cursor: isDrawer ? (tool === "eraser" ? "cell" : "crosshair") : "default",
            width: "100%", maxWidth: 700, touchAction: "none",
          }}
          onMouseDown={onPointerDown} onMouseMove={onPointerMove}
          onMouseUp={onPointerUp} onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp}
        />
      </div>
    </div>
  );
}