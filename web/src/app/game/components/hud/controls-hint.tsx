"use client";

import React from "react";

const hintStyle: React.CSSProperties = {
  background: "rgba(255, 246, 214, 0.92)",
  border: "2px solid #2b1a08",
  boxShadow: "3px 3px 0 #2b1a08",
  color: "#2b1a08",
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  fontSize: 9,
  letterSpacing: "0.03em",
  lineHeight: 1.5,
  padding: "6px 9px",
  pointerEvents: "none",
  position: "fixed",
  right: 16,
  top: 14,
  zIndex: "var(--ui-popup-z-index)",
};

const ControlsHint = () => {
  return (
    <div className="hud-controls-hint" style={hintStyle} aria-hidden="true">
      <div>
        <strong>WASD</strong> / <strong>ARROWS</strong> MOVE
      </div>
      <div>
        <strong>E</strong> INTERACT · <strong>ESC</strong> CLOSE
      </div>
      <div>
        <strong>N</strong> TOWN NEWS
      </div>
    </div>
  );
};

export default ControlsHint;
