"use client";

import { cn } from "@/lib/utils";

interface VitalsStripProps {
  className?: string;
  color?: "primary" | "teal" | "amber";
  height?: number;
}

const COLOR_MAP: Record<NonNullable<VitalsStripProps["color"]>, string> = {
  primary: "var(--primary)",
  teal: "var(--teal)",
  amber: "var(--amber)",
};

/**
 * A looping ECG-style waveform. Two staggered <path> copies scroll
 * left via CSS animation to read as a continuous live signal without
 * needing JS-driven animation frames.
 */
export function VitalsStrip({ className, color = "primary", height = 64 }: VitalsStripProps) {
  const stroke = COLOR_MAP[color];
  const path =
    "M0,32 L60,32 L72,32 L80,8 L92,58 L104,32 L120,32 L180,32 L192,32 L200,10 L212,54 L224,32 L240,32 L300,32";

  return (
    <div
      className={cn("relative w-full overflow-hidden", className)}
      style={{ height }}
      aria-hidden="true"
    >
      <svg
        className="vitals-track absolute left-0 top-0 h-full"
        style={{ width: "600px" }}
        viewBox="0 0 300 64"
        preserveAspectRatio="none"
        fill="none"
      >
        <path d={path} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
      </svg>
      <svg
        className="vitals-track absolute left-[300px] top-0 h-full"
        style={{ width: "600px" }}
        viewBox="0 0 300 64"
        preserveAspectRatio="none"
        fill="none"
      >
        <path d={path} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
      </svg>
      <style jsx>{`
        .vitals-track {
          animation: vitals-scroll 6s linear infinite;
        }
        @keyframes vitals-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-600px);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .vitals-track {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
