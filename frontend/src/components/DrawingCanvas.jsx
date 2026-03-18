// src/components/DrawingCanvas.jsx
import { useRef, useEffect, useState, useCallback } from "react";
import socket from "../socket";

const COLORS = ["#000000","#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899","#ffffff"];
const SIZES = [2, 5, 10, 20];

export default function DrawingCanvas({ isDrawer, round }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef(null);
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(5);
  const [tool, setTool] = useState("pen");

  // ── Clear canvas on every new round ─────────────────────
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) clearCtx(ctx);
  }, [round]);

  // ── Incoming strokes (other clients) ────────────────────
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    const handler = (stroke) => drawStroke(ctx, stroke);
    const clearHandler = () => clearCtx(ctx);
    socket.on("draw", handler);
    socket.on("clear_canvas", clearHandler);
    return () => {
      socket.off("draw", handler);
      socket.off("clear_canvas", clearHandler);
    };
  }, []);

  const clearCtx = (ctx) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  };

  const drawStroke = (ctx, { x1, y1, x2, y2, color, size, tool }) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches?.[0];
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;
    // Scale for canvas resolution
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
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
    const stroke = {
      x1: lastPos.current.x,
      y1: lastPos.current.y,
      x2: pos.x,
      y2: pos.y,
      color,
      size,
      tool,
    };
    drawStroke(ctx, stroke);
    socket.emit("draw", stroke);
    lastPos.current = pos;
  }, [isDrawer, color, size, tool]);

  const onPointerUp = useCallback(() => {
    isDrawing.current = false;
    lastPos.current = null;
  }, []);

  const handleClear = () => {
    const ctx = canvasRef.current.getContext("2d");
    clearCtx(ctx);
    socket.emit("clear_canvas");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {isDrawer && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Colors */}
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setTool("pen"); }}
              style={{
                width: 28, height: 28, borderRadius: "50%",
                background: c,
                border: color === c && tool === "pen" ? "3px solid #6366f1" : "2px solid #ccc",
                cursor: "pointer",
              }}
            />
          ))}
          {/* Eraser */}
          <button
            onClick={() => setTool("eraser")}
            style={{
              padding: "4px 10px", borderRadius: 6,
              background: tool === "eraser" ? "#6366f1" : "#e5e7eb",
              color: tool === "eraser" ? "#fff" : "#000",
              border: "none", cursor: "pointer", fontWeight: 600,
            }}
          >
            ✏️ Eraser
          </button>
          {/* Sizes */}
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              style={{
                width: 28, height: 28, borderRadius: "50%",
                background: size === s ? "#6366f1" : "#e5e7eb",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <span style={{ width: s, height: s, background: size === s ? "#fff" : "#555", borderRadius: "50%", display: "block" }} />
            </button>
          ))}
          {/* Clear */}
          <button
            onClick={handleClear}
            style={{
              padding: "4px 12px", borderRadius: 6,
              background: "#ef4444", color: "#fff",
              border: "none", cursor: "pointer", fontWeight: 600,
            }}
          >
            🗑️ Clear
          </button>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={700}
        height={450}
        style={{
          background: "#fff",
          borderRadius: 12,
          border: "2px solid #e5e7eb",
          cursor: isDrawer ? (tool === "eraser" ? "cell" : "crosshair") : "default",
          width: "100%",
          maxWidth: 700,
          touchAction: "none",
        }}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
      />
    </div>
  );
}