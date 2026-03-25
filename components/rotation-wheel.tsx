"use client";

import React, { useMemo } from "react";

export const DEFAULT_MEMBERS = ["はる", "メリ", "おゆ", "OGA", "ラメ"];
export const DUTY_COUNT = 2;

const DUTY_COLOR = "#E05A3A";
const REST_COLOR = "#2d4a6b";
const RING_DUTY  = "#4da6c8";
const RING_REST  = "#1e3a6e";

interface RotationWheelProps {
  dayOffset: number;
  members?: string[];
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(
  cx: number, cy: number,
  rInner: number, rOuter: number,
  startAngle: number, endAngle: number
): string {
  const s1 = polarToCartesian(cx, cy, rOuter, startAngle);
  const e1 = polarToCartesian(cx, cy, rOuter, endAngle);
  const s2 = polarToCartesian(cx, cy, rInner, endAngle);
  const e2 = polarToCartesian(cx, cy, rInner, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${s1.x} ${s1.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${e1.x} ${e1.y}`,
    `L ${s2.x} ${s2.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${e2.x} ${e2.y}`,
    "Z",
  ].join(" ");
}

export function RotationWheel({ dayOffset, members = DEFAULT_MEMBERS }: RotationWheelProps) {
  const total = members.length;
  const cx = 200, cy = 200;
  const rOuter = 195, rMid = 120, rInner = 65;

  const dutyIndices = useMemo(() => {
    if (total === 0) return [];
    return [dayOffset % total, (dayOffset + 1) % total];
  }, [dayOffset, total]);

  const sliceAngle     = total > 0 ? 360 / total : 360;
  const gap            = 2.5;
  const dutyStartAngle = dutyIndices.length > 0 ? dutyIndices[0] * sliceAngle : 0;
  const dutyEndAngle   = dutyStartAngle + DUTY_COUNT * sliceAngle;
  const restStartAngle = dutyEndAngle;
  const restEndAngle   = dutyStartAngle + 360;

  const dutyMidAngle = dutyStartAngle + (DUTY_COUNT * sliceAngle) / 2;
  const restMidAngle = restStartAngle + (restEndAngle - restStartAngle) / 2;
  const labelR       = (rOuter + rMid) / 2;
  const dutyLabelPos = polarToCartesian(cx, cy, labelR, dutyMidAngle);
  const restLabelPos = polarToCartesian(cx, cy, labelR, restMidAngle);

  return (
    <svg
      viewBox="0 0 400 400"
      className="w-full max-w-2xl mx-auto"
      aria-label="掃除当番ローテーションホイール"
    >
      {/* Outer ring */}
      <path d={slicePath(cx, cy, rMid + 2, rOuter, dutyStartAngle, dutyEndAngle)} fill={RING_DUTY} />
      <path d={slicePath(cx, cy, rMid + 2, rOuter, restStartAngle, restEndAngle)} fill={RING_REST} />

      {/* Inner member slices */}
      {members.map((name, i) => {
        const start    = i * sliceAngle + gap / 2;
        const end      = (i + 1) * sliceAngle - gap / 2;
        const isDuty   = dutyIndices.includes(i);
        const midAngle = (start + end) / 2;
        const lp       = polarToCartesian(cx, cy, (rMid + rInner) / 2, midAngle);
        return (
          <g key={`${name}-${i}`}>
            <path d={slicePath(cx, cy, rInner + 2, rMid, start, end)} fill={isDuty ? DUTY_COLOR : REST_COLOR} />
            <text
              x={lp.x} y={lp.y}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="13" fontWeight="700" fill="white"
              transform={`rotate(${midAngle}, ${lp.x}, ${lp.y})`}
              style={{ fontFamily: "var(--font-noto-sans-jp, sans-serif)" }}
            >
              {name}
            </text>
          </g>
        );
      })}

      {/* Center hole */}
      <circle cx={cx} cy={cy} r={rInner} fill="#0f1c2e" />
      <circle cx={cx} cy={cy} r={rInner - 3} fill="#162a4e" />

      {/* 掃除 label — follows duty arc */}
      <text
        x={dutyLabelPos.x} y={dutyLabelPos.y}
        textAnchor="middle" dominantBaseline="middle"
        fontSize="22" fontWeight="900" fill="white"
        transform={`rotate(${dutyMidAngle}, ${dutyLabelPos.x}, ${dutyLabelPos.y})`}
        style={{ fontFamily: "var(--font-noto-sans-jp, sans-serif)" }}
      >
        掃除
      </text>

      {/* Rest label — follows rest arc */}
      <text
        x={restLabelPos.x} y={restLabelPos.y}
        textAnchor="middle" dominantBaseline="middle"
        fontSize="16" fontWeight="600" fill="#c8d8f0"
        transform={`rotate(${restMidAngle}, ${restLabelPos.x}, ${restLabelPos.y})`}
        style={{ fontFamily: "var(--font-noto-sans-jp, sans-serif)" }}
      >
        Rest
      </text>
    </svg>
  );
}
