"use client";

import React from "react";

interface WaterDropBadgeProps {
  name: string;
  size?: "lg" | "md" | "sm";
  variant?: "duty" | "tomorrow" | "rotation";
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDropTarget?: boolean;
}

// Simple teardrop path in a 100×120 viewBox.
// Top tip at (50, 2), circular belly at bottom.
const DROP_PATH = "M 50 2 C 50 2, 8 50, 8 76 A 42 42 0 0 0 92 76 C 92 50, 50 2, 50 2 Z";

const SIZES: Record<string, { w: number; h: number; fontSize: number; responsive?: boolean }> = {
  lg: { w: 180, h: 216, fontSize: 22, responsive: true },
  md: { w: 80,  h: 96,  fontSize: 14 },
  sm: { w: 52,  h: 62,  fontSize: 10 },
};

export function WaterDropBadge({
  name,
  size = "md",
  draggable,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isDropTarget,
}: WaterDropBadgeProps) {
  const { w, h, fontSize } = SIZES[size];
  const clipId = `clip-${name}-${size}`;

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 100 120"
      aria-label={name}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        display: "inline-block",
        flexShrink: 0,
        overflow: "visible",
        cursor: draggable ? "grab" : "default",
        filter: isDropTarget
          ? "drop-shadow(0 0 6px #4da6c8)"
          : "drop-shadow(0 3px 8px rgba(0,0,0,0.4))",
        transform: isDropTarget ? "scale(1.08)" : "scale(1)",
        transition: "filter 0.15s, transform 0.15s",
      }}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={DROP_PATH} />
        </clipPath>
      </defs>

      {/* Single flat sky-blue fill — nothing else */}
      <path d={DROP_PATH} fill="#4da6c8" />

      {/* Name text clipped inside the drop */}
      <text
        x="50"
        y="82"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#ffffff"
        fontSize={fontSize}
        fontWeight={600}
        fontFamily="'Noto Sans JP', sans-serif"
        letterSpacing="0.04em"
        clipPath={`url(#${clipId})`}
        style={{ userSelect: "none" }}
      >
        {name}
      </text>
    </svg>
  );
}
