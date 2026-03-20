// src/components/DrawingCanvas.jsx
import { useRef, useEffect, useState, useCallback } from "react";
import { Eraser, Trash2, Pencil, PaintBucket, Undo2 } from "lucide-react";
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
const CANVAS_BG = "#1a1f2e";
const MAX_HISTORY = 50;

// Convert hex color string to [r, g, b, a]
function hexToRgba(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return [r, g, b, 255];
}

// Flood fill implementation
function floodFill(ctx, startX, startY, fillColor) {
  startX = Math.round(startX);
  startY = Math.round(startY);
  const { width, height } = ctx.canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const idx = (x, y) => (y * width + x) * 4;

  const target = data.slice(idx(startX, startY), idx(startX, startY) + 4);
  const fill = hexToRgba(fillColor);

  // Don't fill if clicking on same color
  if (
    target[0] === fill[0] &&
    target[1] === fill[1] &&
    target[2] === fill[2] &&
    target[3] === fill[3]
  ) return;

  const tolerance = 30;
  const matches = (i) =>
    Math.abs(data[i] - target[0]) <= tolerance &&
    Math.abs(data[i + 1] - target[1]) <= tolerance &&
    Math.abs(data[i + 2] - target[2]) <= tolerance &&
    Math.abs(data[i + 3] - target[3]) <= tolerance;

  const stack = [[startX, startY]];
  const visited = new Uint8Array(width * height);

  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const i = idx(x, y);
    const vi = y * width + x;
    if (visited[vi] || !matches(i)) continue;
    visited[vi] = 1;

    data[i] = fill[0];
    data[i + 1] = fill[1];
    data[i + 2] = fill[2];
    data[i + 3] = fill[3];

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  ctx.putImageData(imageData, 0, 0);
}

export default function DrawingCanvas({ isDrawer, registerCanvasSync, sendCanvasSnapshot }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef(null);
  const historyRef = useRef([]);
  const snapshotTimerRef = useRef(null);
  const [color, setColor] = useState("#f0ede8");
  const [size, setSize] = useState(5);
  const [tool, setTool] = useState("pen");
  const [canUndo, setCanUndo] = useState(false);

  // Save current canvas state to history before a stroke/fill
  const pushHistory = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const snapshot = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    historyRef.current.push(snapshot);
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }
    setCanUndo(true);
  }, []);

  const undo = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || historyRef.current.length === 0) return;
    const snapshot = historyRef.current.pop();
    ctx.putImageData(snapshot, 0, 0);
    setCanUndo(historyRef.current.length > 0);
    // Broadcast undo to other clients via socket
    socket.emit("undo_canvas", { dataUrl: canvasRef.current.toDataURL() });
  }, []);

  const clearCtx = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    historyRef.current = [];
    setCanUndo(false);
  }, []);

  const drawStroke = (ctx, { x1, y1, x2, y2, color, size, tool }) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = tool === "eraser" ? CANVAS_BG : color;
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

    const onFill = ({ x, y, color }) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) floodFill(ctx, x, y, color);
    };

    // Sync undo from other clients by restoring their canvas state
    const onUndo = ({ dataUrl }) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = dataUrl;
    };

    socket.on("draw", onDraw);
    socket.on("fill_canvas", onFill);
    socket.on("undo_canvas", onUndo);

    // Late-join: restore canvas from snapshot
    const onCanvasSync = (dataUrl) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = dataUrl;
    };
    if (registerCanvasSync) registerCanvasSync(onCanvasSync);

    return () => {
      socket.off("start_round", clearCtx);
      socket.off("clear_canvas", clearCtx);
      socket.off("draw", onDraw);
      socket.off("fill_canvas", onFill);
      socket.off("undo_canvas", onUndo);
    };
  }, [clearCtx, registerCanvasSync]);

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
    const pos = getPos(e);

    if (tool === "fill") {
      pushHistory();
      const ctx = canvasRef.current.getContext("2d");
      floodFill(ctx, pos.x, pos.y, color);
      socket.emit("fill_canvas", { x: pos.x, y: pos.y, color });
      return;
    }

    pushHistory();
    isDrawing.current = true;
    lastPos.current = pos;
  }, [isDrawer, tool, color, pushHistory]);

  const onPointerMove = useCallback((e) => {
    if (!isDrawer || !isDrawing.current || tool === "fill") return;
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    const stroke = {
      x1: lastPos.current.x, y1: lastPos.current.y,
      x2: pos.x, y2: pos.y,
      color, size, tool,
    };
    drawStroke(ctx, stroke);
    socket.emit("draw", stroke);
    lastPos.current = pos;
  }, [isDrawer, color, size, tool]);

  const onPointerUp = useCallback(() => {
    isDrawing.current = false;
    lastPos.current = null;
  }, []);

  // Send canvas snapshot every 3s when drawing (for late-join sync)
  useEffect(() => {
    if (!isDrawer || !sendCanvasSnapshot) return;
    snapshotTimerRef.current = setInterval(() => {
      const canvas = canvasRef.current;
      if (canvas) sendCanvasSnapshot(canvas.toDataURL());
    }, 3000);
    return () => clearInterval(snapshotTimerRef.current);
  }, [isDrawer, sendCanvasSnapshot]);

  const handleClear = () => {
    clearCtx();
    socket.emit("clear_canvas");
  };

  // Keyboard shortcut: Ctrl+Z / Cmd+Z
  useEffect(() => {
    if (!isDrawer) return;
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDrawer, undo]);

  const toolBtn = (thisTool, icon, label) => (
    <button
      onClick={() => setTool(thisTool)}
      style={{
        padding: "5px 10px", borderRadius: 8, cursor: "pointer",
        background: tool === thisTool ? `${T.accent}22` : T.surfaceHi,
        border: `1.5px solid ${tool === thisTool ? T.accent : T.border}`,
        color: tool === thisTool ? T.accent : T.muted,
        display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
        transition: "all 0.15s", flexShrink: 0,
      }}
    >
      {icon} {label}
    </button>
  );

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
                  border: color === c && tool !== "eraser"
                    ? `3px solid ${T.accent}`
                    : "2px solid rgba(255,255,255,0.15)",
                  cursor: "pointer", transition: "transform 0.1s",
                  transform: color === c && tool !== "eraser" ? "scale(1.2)" : "scale(1)",
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

          {/* Tool buttons */}
          {toolBtn("pen", <Pencil size={14} />, "Pen")}
          {toolBtn("eraser", <Eraser size={14} />, "Eraser")}
          {toolBtn("fill", <PaintBucket size={14} />, "Fill")}

          {/* Undo */}
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            style={{
              padding: "5px 10px", borderRadius: 8, cursor: canUndo ? "pointer" : "not-allowed",
              background: T.surfaceHi,
              border: `1.5px solid ${T.border}`,
              color: canUndo ? T.muted : `${T.muted}55`,
              display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
              transition: "all 0.15s", flexShrink: 0,
              opacity: canUndo ? 1 : 0.45,
            }}
          >
            <Undo2 size={14} /> Undo
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
            background: CANVAS_BG,
            display: "block",
            cursor: isDrawer
              ? tool === "eraser"
                ? "cell"
                : tool === "fill"
                  ? "crosshair"
                  : "crosshair"
              : "default",
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